import postgres from "postgres";
// Side-effect import: fails fast with a readable message if a *provided*
// env var is malformed (e.g. a too-short SESSION_COOKIE_SECRET) — see
// `src/lib/env.ts`'s doc comment. Every server-side schema field is
// `.optional()`, so this never throws for a merely *missing* value,
// only a malformed one; safe at Next's build-time module evaluation.
import "@/lib/env";

/**
 * The single Postgres connection pool for the trusted tier (replaces
 * `src/server/firestore/client.ts`). Cached on `globalThis` so Next.js's
 * dev-mode module reloading doesn't open a fresh pool on every edit — the
 * same reasoning as the old Firestore singleton.
 *
 * Construction never throws for a missing `DATABASE_URL` — postgres.js
 * connects lazily on first query, and Next.js's build step imports every
 * Route Handler module (with no real environment configured) to collect
 * page data, so a throw here at module scope would break every build.
 *
 * The same class of bug this pattern caused for `supabase-admin.ts`
 * (B103 — a placeholder-built client cached for the rest of the
 * process's life) is possible here too, even though it hasn't been
 * observed: a proxy re-checks on every access and only trusts the cache
 * once it was built from a real `DATABASE_URL`, rather than trusting
 * whatever was true the first time this module was ever evaluated.
 */
declare global {
  var __haloSql: { sql: postgres.Sql; isPlaceholder: boolean } | undefined;
}

function createSqlClient(): { sql: postgres.Sql; isPlaceholder: boolean } {
  const connectionString = process.env.DATABASE_URL;
  const isPlaceholder = !connectionString;
  const client = postgres(connectionString ?? "postgres://unconfigured@127.0.0.1:54322/postgres", {
    onnotice: () => {},
  });
  return { sql: client, isPlaceholder };
}

function resolveSql(): postgres.Sql {
  const cached = globalThis.__haloSql;
  if (cached && !cached.isPlaceholder) {
    return cached.sql;
  }
  const built = createSqlClient();
  if (!built.isPlaceholder) {
    globalThis.__haloSql = built;
  }
  return built.sql;
}

export const sql: postgres.Sql = new Proxy(function () {} as unknown as postgres.Sql, {
  apply(_target, thisArg, args) {
    return Reflect.apply(resolveSql() as unknown as (...a: unknown[]) => unknown, thisArg, args);
  },
  get(_target, prop, receiver) {
    return Reflect.get(resolveSql(), prop, receiver);
  },
});

/**
 * Runs `fn` inside a single Postgres transaction, handing it a
 * transaction-scoped `sql` tag — the direct equivalent of Firestore's
 * `db.runTransaction`. Unlike Firestore's optimistic transactions,
 * Postgres transactions here use real row locking (`SELECT ... FOR
 * UPDATE`, issued explicitly by callers that need it, e.g.
 * `reserveNumber`) rather than an optimistic-retry model — so a
 * transaction body runs exactly once per call, never twice for one
 * committed result the way Firestore's docs warn about.
 */
export async function withTransaction<T>(
  fn: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  // `sql.begin`'s own generic signature can't structurally prove
  // `UnwrapPromiseArray<Promise<T>>` reduces to `T` for an arbitrary `T`
  // — it does, at runtime, for every real caller here (none returns an
  // array of promises).
  return sql.begin(fn) as Promise<T>;
}
