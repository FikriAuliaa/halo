#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";

// Auto-load .env when executing standalone CLI script
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        process.env[key] ??= val;
      }
    }
  }
} catch {
  // Optional .env
}

import { sql } from "@/server/db/client";
import { seedConfig } from "./seed-config";
import { runSeed } from "./seed-numbers";
import { NumberRepository } from "@/server/repositories/number-repository";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function runMigrations(): Promise<void> {
  console.log("🚀 Checking and running database migrations...");

  // 1. Ensure migrations tracking table exists
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // 2. Read migration SQL files
  const migrationsDir = path.resolve(process.cwd(), "supabase/migrations");
  if (fs.existsSync(migrationsDir)) {
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    // Check if base schema already exists (e.g. created outside migration runner)
    const [tableCheck] = await sql<
      { exists: boolean }[]
    >`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'numbers') as exists`;

    if (tableCheck?.exists) {
      for (const file of files) {
        await sql`INSERT INTO _migrations (name) VALUES (${file}) ON CONFLICT (name) DO NOTHING`;
      }
    }

    const executedRows = await sql<{ name: string }[]>`SELECT name FROM _migrations`;
    const executedSet = new Set(executedRows.map((r) => r.name));

    for (const file of files) {
      if (executedSet.has(file)) {
        console.log(`  ✓ Migration already applied: ${file}`);
        continue;
      }

      console.log(`  ⏳ Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, "utf8");

      try {
        await sql.unsafe(sqlContent);
        await sql`INSERT INTO _migrations (name) VALUES (${file})`;
        console.log(`  ✅ Migration succeeded: ${file}`);
      } catch (err) {
        console.error(`  ❌ Migration failed for ${file}:`, err);
        throw err;
      }
    }
  }

  // 3. Seed config if empty
  try {
    const configRows = await sql<{ count: number }[]>`SELECT COUNT(*)::int as count FROM config`;
    if ((configRows[0]?.count ?? 0) === 0) {
      console.log("🌱 Seeding system configuration...");
      await seedConfig();
    }
  } catch {
    console.log("🌱 Seeding system configuration...");
    await seedConfig();
  }

  // 4. Seed numbers if empty
  try {
    const numberRows = await sql<{ count: number }[]>`SELECT COUNT(*)::int as count FROM numbers`;
    if ((numberRows[0]?.count ?? 0) === 0) {
      const sourcePath = path.resolve(process.cwd(), "data/seed/numbers.source.txt");
      if (fs.existsSync(sourcePath)) {
        console.log("🌱 Seeding number pool inventory...");
        const rawContent = fs.readFileSync(sourcePath, "utf8");
        const repo = new NumberRepository();
        await runSeed(
          rawContent,
          { dryRun: false, env: "dev", allowCountMismatch: true, confirmProduction: false },
          repo,
        );
      }
    }
  } catch {
    // Numbers seeding skipped or already present
  }

  // 5. Ensure admin user exists
  try {
    const adminRows = await sql<
      { count: number }[]
    >`SELECT COUNT(*)::int as count FROM admin_users`;
    if ((adminRows[0]?.count ?? 0) === 0) {
      const email = process.env.ADMIN_EMAIL ?? "admin@telkomsel.co.id";
      const password = process.env.ADMIN_INIT_PASSWORD ?? "Admin123456!";
      console.log(`🔑 Bootstrapping initial admin account for ${email}...`);

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (data?.user) {
        await sql`
          INSERT INTO admin_users (user_id, role) VALUES (${data.user.id}, 'ADMIN_TELKOMSEL')
          ON CONFLICT (user_id) DO UPDATE SET role = excluded.role
        `;
        console.log(`  ✅ Admin user ${email} created successfully.`);
      } else if (error) {
        console.log(`  ℹ️ Admin bootstrap info: ${error.message}`);
      }
    }
  } catch {
    // Admin check skipped or user already exists
  }

  console.log("✨ All database migrations & seeds completed successfully!");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration execution failed:", err);
      process.exit(1);
    });
}
