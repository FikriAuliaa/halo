import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE_NAME } from "@/server/auth/session-cookie";
import { SESSION_COOKIE_NAME, createSessionCookie } from "@/server/framework/session";

/** Middleware runs in the Edge runtime — no `node:crypto` there, only
 * the standard Web Crypto API. */
function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Security headers and CSP (B116). Nonce-based, not `unsafe-inline`, for
 * scripts — Next.js auto-applies whatever nonce appears in this header
 * to the script tags it injects itself, so no per-component wiring is
 * needed. `strict-dynamic` lets those nonce'd scripts load Next's
 * code-split chunks without listing every chunk URL. `style-src` keeps
 * `unsafe-inline`: Tailwind/React's inline `style` attributes are a much
 * weaker XSS vector than script injection, and a nonce-per-style-tag
 * scheme isn't practical here.
 *
 * `imgSrc` includes the actual configured Supabase origin (proofs and
 * the QRIS image are served from there) — resolved from `SUPABASE_URL`
 * at request time rather than hardcoded, so this doesn't silently break
 * or silently stay too permissive across environments.
 */
function buildCsp(nonce: string, request?: NextRequest): string {
  const supabaseOrigin = (() => {
    try {
      return new URL(process.env.SUPABASE_URL ?? "").origin;
    } catch {
      return "";
    }
  })();

  const isDev = process.env.NODE_ENV !== "production";
  const isLocal = request
    ? request.nextUrl.hostname === "localhost" ||
      request.nextUrl.hostname === "127.0.0.1" ||
      request.nextUrl.protocol === "http:"
    : false;

  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `img-src 'self' data: blob: ${supabaseOrigin}`.trim(),
    `font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com data:`,
    `connect-src 'self' ${supabaseOrigin}${isDev ? " ws:" : ""}`.trim(),
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(isDev || isLocal ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

/**
 * Coarse, cheap admin gate (B095) — a cookie-presence check only, purely
 * for the pleasant redirect-with-destination UX on the common case (no
 * session at all). This is **not** the security control: every admin
 * page (`requireAdmin`) and every `/api/admin/*` handler (`createHandler`'s
 * `requireRole`) independently and fully re-verifies the token regardless
 * of what this middleware decided. Disabling this file entirely must not
 * open any endpoint — it only would degrade the redirect UX.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const hasSession = request.cookies.has(ADMIN_SESSION_COOKIE_NAME);
    if (!hasSession) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  const nonce = generateNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  let sessionCookieToSet: ReturnType<typeof createSessionCookie> | null = null;
  if (!request.cookies.has(SESSION_COOKIE_NAME)) {
    sessionCookieToSet = createSessionCookie();
    const existingCookieHeader = request.headers.get("cookie");
    const newCookieHeader = existingCookieHeader
      ? `${existingCookieHeader}; ${SESSION_COOKIE_NAME}=${sessionCookieToSet.value}`
      : `${SESSION_COOKIE_NAME}=${sessionCookieToSet.value}`;
    requestHeaders.set("cookie", newCookieHeader);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  if (sessionCookieToSet) {
    response.cookies.set(sessionCookieToSet.name, sessionCookieToSet.value, {
      httpOnly: sessionCookieToSet.httpOnly,
      secure: sessionCookieToSet.secure,
      sameSite: sessionCookieToSet.sameSite,
      path: sessionCookieToSet.path,
      maxAge: sessionCookieToSet.maxAge,
    });
  }

  response.headers.set("Content-Security-Policy", buildCsp(nonce, request));
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // The tracking route resolves a secret token from a URL/body — never
  // leak it via the `Referer` header of an outbound link (B090).
  response.headers.set(
    "Referrer-Policy",
    pathname === "/lacak" ? "no-referrer" : "strict-origin-when-cross-origin",
  );

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
