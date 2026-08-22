#!/usr/bin/env tsx
/**
 * Assigns a role to an existing Supabase Auth user (B093). Does not
 * create the account — use the Supabase dashboard, Supabase's own signup
 * flow, or `bootstrap-admin.ts` (first account only) for that.
 *
 * Usage: pnpm set-admin-role --email=admin@example.com --role=ADMIN_KAMPUS
 */
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sql } from "@/server/db/client";

const VALID_ROLES = ["ADMIN_KAMPUS", "ADMIN_TELKOMSEL"] as const;
type Role = (typeof VALID_ROLES)[number];

function parseArgs(argv: string[]): { email: string | undefined; role: Role | undefined } {
  const emailArg = argv.find((a) => a.startsWith("--email="));
  const roleArg = argv.find((a) => a.startsWith("--role="));
  const role = roleArg?.split("=")[1];
  return {
    email: emailArg?.split("=")[1],
    role: VALID_ROLES.includes(role as Role) ? (role as Role) : undefined,
  };
}

async function findUserByEmail(email: string) {
  const PER_PAGE = 200;
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < PER_PAGE) return null;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.email || !args.role) {
    console.error(
      "Usage: pnpm set-admin-role --email=admin@example.com --role=ADMIN_KAMPUS|ADMIN_TELKOMSEL",
    );
    process.exit(1);
  }

  const user = await findUserByEmail(args.email);
  if (!user) {
    console.error(
      `No Supabase Auth user found for ${args.email}. Create the account first (Supabase dashboard, or bootstrap-admin.ts for the first account).`,
    );
    process.exit(1);
  }

  await sql`
    insert into admin_users (user_id, role) values (${user.id}, ${args.role})
    on conflict (user_id) do update set role = excluded.role
  `;

  console.log(`Set ${args.email} (${user.id}) to ${args.role}.`);
  console.log(
    "Takes effect on this admin's very next request — role is looked up live, never cached.",
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("set-admin-role failed:", error);
    process.exit(1);
  });
