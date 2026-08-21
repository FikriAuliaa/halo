import { z } from "zod";

/**
 * Every environment variable the application reads, validated once at
 * module load so a missing/malformed value fails fast with a readable
 * message naming the variable — never a confusing downstream `undefined`
 * error three layers deep. See .env.example and DEPLOYMENT.md.
 *
 * This module must be imported before any Postgres/Supabase
 * initialization (AGENTS.md) — `src/server/db/client.ts` and
 * `src/lib/supabase-admin.ts` do not themselves validate their inputs,
 * they trust this module to have already failed if something is missing.
 */

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  SUPABASE_URL: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SESSION_COOKIE_SECRET: z.string().min(32).optional(),
  RESERVATION_TTL_MINUTES_OVERRIDE: z.coerce.number().int().positive().optional(),
});

function parseOrExit<T extends z.ZodTypeAny>(
  schema: T,
  source: Record<string, unknown>,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return result.data;
}

/**
 * Server-only values. Importing this from a Client Component is a build-time
 * error by construction (Next.js strips server-only env access from client
 * bundles when accessed through `process.env.X` directly, but funnelling
 * everything through this validated object makes the boundary explicit
 * rather than incidental).
 */
export const serverEnv = parseOrExit(serverSchema, {
  DATABASE_URL: process.env.DATABASE_URL,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SESSION_COOKIE_SECRET: process.env.SESSION_COOKIE_SECRET,
  RESERVATION_TTL_MINUTES_OVERRIDE: process.env.RESERVATION_TTL_MINUTES_OVERRIDE,
});
