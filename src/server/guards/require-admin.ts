import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAdminToken } from "@/server/auth/admin-auth";
import { ADMIN_SESSION_COOKIE_NAME, readAdminSessionToken } from "@/server/auth/session-cookie";
import type { AdminRole } from "@/schemas/admin";

export interface RequireAdminResult {
  uid: string;
  email: string | null;
  role: AdminRole;
}

/**
 * Server-side admin guard for Server Component pages (B095). Middleware
 * (`src/middleware.ts`) already redirects a request with no session
 * cookie at all, preserving the intended destination — that's the
 * pleasant common-case UX. This is the real backstop: it independently
 * re-verifies the token regardless of what middleware already decided,
 * because a middleware misconfiguration must never be the only thing
 * standing between a page and an unauthenticated visitor.
 *
 * Deliberately does **not** attempt the refresh-token dance
 * `verifyAdminSession` does for API routes: a Server Component can't set
 * response cookies, so a refreshed token here couldn't be persisted —
 * and if refresh-token rotation is on, calling it without persisting the
 * result would burn the stored refresh token for nothing. In practice
 * the browser's own API calls (which go through `createHandler` and can
 * persist a refresh) keep the cookie fresh; a page load that outlives
 * the access token with no intervening API call just redirects to login,
 * which is a safe, conservative fallback.
 */
export async function requireAdmin(requiredRole?: AdminRole): Promise<RequireAdminResult> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  const session = raw ? readAdminSessionToken(`${ADMIN_SESSION_COOKIE_NAME}=${raw}`) : null;

  if (!session) {
    redirect("/admin/login");
  }

  const verified = await verifyAdminToken(session.access_token);
  if (!verified) {
    redirect("/admin/login");
  }

  if (requiredRole && verified.role !== requiredRole) {
    redirect("/admin/unauthorized");
  }

  return { uid: verified.uid, email: verified.email, role: verified.role };
}
