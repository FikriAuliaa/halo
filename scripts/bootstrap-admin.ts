#!/usr/bin/env tsx
/**
 * Creates the first `ADMIN_TELKOMSEL` account (B093, OQ-4). The password
 * is never accepted as a CLI argument — arguments land in shell history
 * and process listings — it's prompted for interactively instead.
 *
 * Usage:
 *   pnpm bootstrap-admin --email=admin@example.com
 *   pnpm bootstrap-admin --email=admin@example.com --env=prod --confirm-production
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sql } from "@/server/db/client";

interface Args {
  email: string | undefined;
  env: "dev" | "staging" | "prod";
  confirmProduction: boolean;
}

function parseArgs(argv: string[]): Args {
  const emailArg = argv.find((a) => a.startsWith("--email="));
  const envArg = argv.find((a) => a.startsWith("--env="));
  return {
    email: emailArg?.split("=")[1],
    env: (envArg?.split("=")[1] as Args["env"]) ?? "dev",
    confirmProduction: argv.includes("--confirm-production"),
  };
}

async function promptPassword(prompt: string): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    return await rl.question(prompt);
  } finally {
    rl.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.email) {
    console.error(
      "Usage: pnpm bootstrap-admin --email=admin@example.com [--env=staging|prod --confirm-production]",
    );
    process.exit(1);
  }
  if (args.env === "prod" && !args.confirmProduction) {
    console.error("Refusing to run against prod without --confirm-production. See DEPLOYMENT.md.");
    process.exit(1);
  }

  const password = await promptPassword("Set a password for the first admin account: ");
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: args.email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    console.error("Failed to create the Supabase Auth user:", error?.message ?? "unknown error");
    process.exit(1);
  }

  await sql`
    insert into admin_users (user_id, role) values (${data.user.id}, 'ADMIN_TELKOMSEL')
    on conflict (user_id) do update set role = excluded.role
  `;

  console.log(`Bootstrapped ADMIN_TELKOMSEL account for ${args.email} (${data.user.id}).`);
  console.log("Role changes take effect on the very next request — the role is looked up live");
  console.log("from admin_users on every call, never cached in the token, so there's no");
  console.log("stale-privilege window to worry about after a later role change.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Bootstrap failed:", error);
    process.exit(1);
  });
