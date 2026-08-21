import { createScopedAuthClient, supabaseAdmin } from "@/lib/supabase-admin";
import { sql } from "@/server/db/client";
import type { AdminRole } from "@/schemas/admin";
import type { AdminSessionPayload } from "./session-cookie";

export interface VerifiedAdmin {
  uid: string;
  email: string | null;
  role: AdminRole;
  /** Set only when the access token had expired and was silently
   * refreshed using the refresh token — the caller should re-issue the
   * session cookie with these new values. */
  refreshedSession?: AdminSessionPayload;
}

/**
 * Role always comes from the verified token's subject, looked up in
 * `admin_users` — never from the request body or a client-supplied
 * header (B093). A forged `role` field anywhere in a request is simply
 * never read for authorization purposes.
 */
export async function getAdminRole(userId: string): Promise<AdminRole | null> {
  const [row] = await sql<{ role: AdminRole }[]>`
    select role from admin_users where user_id = ${userId}
  `;
  return row?.role ?? null;
}

export async function verifyAdminToken(token: string): Promise<VerifiedAdmin | null> {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  const role = await getAdminRole(data.user.id);
  if (!role) return null;
  return { uid: data.user.id, email: data.user.email ?? null, role };
}

/**
 * Verifies an admin session cookie's access token; if it has expired,
 * silently refreshes using the paired refresh token before giving up —
 * this is what makes the cookie's 8-hour lifetime (`session-cookie.ts`)
 * mean something more than Supabase's own shorter-lived access token.
 */
export async function verifyAdminSession(
  session: AdminSessionPayload,
): Promise<VerifiedAdmin | null> {
  const direct = await verifyAdminToken(session.access_token);
  if (direct) return direct;

  // Scoped, throwaway client — see `createScopedAuthClient`'s doc
  // comment. `refreshSession` mutates whatever client it's called on;
  // calling it on the shared `supabaseAdmin` singleton previously
  // poisoned every later Storage call in the process with this admin's
  // own session.
  const { data, error } = await createScopedAuthClient().auth.refreshSession({
    refresh_token: session.refresh_token,
  });
  if (error || !data.session || !data.user) return null;

  const role = await getAdminRole(data.user.id);
  if (!role) return null;

  return {
    uid: data.user.id,
    email: data.user.email ?? null,
    role,
    refreshedSession: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  };
}
