/**
 * The admin session cookie (B093) — deliberately separate from the
 * anonymous student session cookie (`src/server/framework/session.ts`):
 * different name, different `SameSite` policy (`Strict`, not `Lax` —
 * admin pages have no legitimate cross-site entry point at all), and it
 * carries a real Supabase Auth JWT rather than an opaque CSPRNG value.
 */

export const ADMIN_SESSION_COOKIE_NAME = "halo_admin_session";
const ADMIN_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

export interface AdminSessionCookieAttributes {
  name: string;
  value: string;
  httpOnly: true;
  secure: boolean;
  sameSite: "strict";
  path: "/";
  maxAge: number;
}

export interface AdminSessionPayload {
  access_token: string;
  refresh_token: string;
}

export function readAdminSessionToken(cookieHeader: string | null): AdminSessionPayload | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (rawKey === ADMIN_SESSION_COOKIE_NAME) {
      const raw = rawValue.join("=");
      if (!raw) return null;
      try {
        return JSON.parse(decodeURIComponent(raw)) as AdminSessionPayload;
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function createAdminSessionCookie(
  payload: AdminSessionPayload,
): AdminSessionCookieAttributes {
  return {
    name: ADMIN_SESSION_COOKIE_NAME,
    value: encodeURIComponent(JSON.stringify(payload)),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  };
}

/** `maxAge: 0` — the standard way to tell a browser to delete a cookie
 * immediately. Server-side revocation (the part that actually matters,
 * B096) happens separately via `supabaseAdmin.auth.admin.signOut`. */
export function clearedAdminSessionCookie(): AdminSessionCookieAttributes {
  return {
    name: ADMIN_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  };
}

export function applyAdminSessionCookie(
  response: Response,
  cookie: AdminSessionCookieAttributes,
): void {
  const parts = [
    `${cookie.name}=${cookie.value}`,
    `Path=${cookie.path}`,
    `Max-Age=${cookie.maxAge}`,
    "HttpOnly",
    `SameSite=${cookie.sameSite === "strict" ? "Strict" : cookie.sameSite}`,
  ];
  if (cookie.secure) parts.push("Secure");
  response.headers.append("Set-Cookie", parts.join("; "));
}
