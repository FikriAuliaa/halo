import { createClient, type SupabaseClient } from "@supabase/supabase-js";
// Side-effect import — see the identical note in `src/server/db/client.ts`.
import "@/lib/env";

/**
 * The service-role Supabase client for the trusted tier (replaces
 * `firebase-admin.ts`). This is the only place the service-role key is
 * used — every repository and server operation that needs Auth or
 * Storage imports its client from here, never constructs its own. The
 * service-role key bypasses Row Level Security entirely, mirroring how
 * the Firebase Admin SDK bypassed Firestore security rules.
 *
 * Construction never throws for a missing `SUPABASE_URL`/
 * `SUPABASE_SERVICE_ROLE_KEY` — Next.js's build step imports every Route
 * Handler module to collect page data, with no real environment
 * configured, so a throw at module scope here would break every build.
 *
 * A missing env var isn't the only way this client can go stale/wrong —
 * see `createScopedAuthClient` below for a second, since-fixed footgun
 * where *this* singleton's own auth state got mutated by a sign-in call
 * elsewhere in the app. The proxy below re-checks on every access and
 * only trusts the `globalThis` cache once it was built from real config,
 * so a genuinely unconfigured environment keeps retrying (cheap) instead
 * of caching a permanently-broken client.
 */
declare global {
  var __haloSupabaseAdmin: { client: SupabaseClient; isPlaceholder: boolean } | undefined;
}

function resolveUrlAndKey(): { url: string; serviceRoleKey: string; isPlaceholder: boolean } {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    url: url ?? "http://127.0.0.1:54321",
    serviceRoleKey: serviceRoleKey ?? "unconfigured",
    isPlaceholder: !url || !serviceRoleKey,
  };
}

function createAdminClient(): { client: SupabaseClient; isPlaceholder: boolean } {
  const { url, serviceRoleKey, isPlaceholder } = resolveUrlAndKey();
  const client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return { client, isPlaceholder };
}

/**
 * A brand-new, never-cached client for auth operations that mutate
 * client-side session state (`signInWithPassword`, `refreshSession`).
 *
 * This is not paranoia: it fixed a real, live bug (B103/B094/B104). Both
 * calls set `this.currentSession` on whatever `SupabaseClient` instance
 * they're called on, and every subsequent Storage/PostgREST request made
 * through *that same instance* then authenticates as that end user
 * instead of the service role — silently, since it's still a
 * well-formed request that just carries the wrong `Authorization`
 * header. Calling either on the shared `supabaseAdmin` singleton
 * poisoned it for the rest of the process's life: after the first admin
 * login, every later `supabaseAdmin.storage` call ran as that admin's
 * own `authenticated`-role JWT, which RLS (enabled, zero policies)
 * silently reduced to nothing — surfacing as "Object not found" for a
 * proof file that demonstrably existed. A fresh, discarded client per
 * call can't leak its session anywhere; login/refresh are infrequent
 * enough that skipping the connection-pool-style singleton costs nothing
 * real.
 */
export function createScopedAuthClient(): SupabaseClient {
  const { url, serviceRoleKey } = resolveUrlAndKey();
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function resolveAdminClient(): SupabaseClient {
  const cached = globalThis.__haloSupabaseAdmin;
  if (cached && !cached.isPlaceholder) {
    return cached.client;
  }
  // No cache yet, or the cached client was built from placeholders —
  // (re)construct, and only cache the result if it's now real config,
  // so a genuinely unconfigured environment keeps retrying (cheap; it's
  // just an object construction, no network call) rather than caching
  // a permanently-broken client either.
  const built = createAdminClient();
  if (!built.isPlaceholder) {
    globalThis.__haloSupabaseAdmin = built;
  }
  return built.client;
}

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(resolveAdminClient(), prop, receiver);
  },
});
