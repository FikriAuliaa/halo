import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE_NAME } from "@/server/auth/session-cookie";

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
function buildCsp(nonce: string): string {
  const supabaseOrigin = (() => {
    try {
      return new URL(process.env.SUPABASE_URL ?? "").origin;
    } catch {
      return "";
    }
  })();

  // Next.js's dev-mode webpack bundle (React Refresh / HMR) evaluates
  // module wrappers via `eval`, and its hot-reload client connects over
  // a same-origin websocket — both are inert in a production build.
  // Found live: a strict CSP with no `unsafe-eval` silently broke *all*
  // client-side JS execution in dev mode (a `PAGEERROR` for every page
  // load), which a static-HTML/header check alone never surfaces —
  // caught only once a real browser (Playwright) actually ran the page.
  const isDev = process.env.NODE_ENV !== "production";

  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: ${supabaseOrigin}`.trim(),
    `font-src 'self'`,
    // Needs the same Supabase origin as `img-src`: the QRIS "Simpan QR"
    // button `fetch()`s the already-displayed image itself to build a
    // same-origin `blob:` URL, since a plain `<a download>` is silently
    // ignored by every browser for a cross-origin `href`.
    `connect-src 'self' ${supabaseOrigin}${isDev ? " ws:" : ""}`.trim(),
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    // Only in production: WebKit/Safari enforces this far more
    // aggressively than Chromium — it upgrades every *subresource*
    // request to HTTPS even when the top-level page itself is plain
    // HTTP, which is exactly what a local `next dev` server is. Found
    // live: every CSS/JS/font request failed with a TLS error in
    // Safari (and Playwright's WebKit), because the dev server has no
    // HTTPS listener to upgrade to — the page loaded, but nothing else
    // did. A real deployment is HTTPS already, so this is a no-op there.
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
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

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set("Content-Security-Policy", buildCsp(nonce));
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
