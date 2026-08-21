import { generateSessionId } from "@/lib/id";

/**
 * The reservation session cookie. Opaque, httpOnly, never read or
 * constructed by client-side code (AGENTS.md, master prompt §9) — the
 * client only ever learns its reservation state through what a Route
 * Handler chooses to tell it.
 */
export const SESSION_COOKIE_NAME = "halo_session";
const SESSION_COOKIE_MAX_AGE_SECONDS = 30 * 60; // generous vs. the 15-minute TTL, so a slightly-late request can still be attributed to the right session.

export interface SessionCookieAttributes {
  name: string;
  value: string;
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
}

/** Parses the raw `Cookie` request header — portable across `Request`/`NextRequest`. */
export function readSessionId(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (rawKey === SESSION_COOKIE_NAME) {
      return rawValue.join("=") || null;
    }
  }
  return null;
}

/** Mints a fresh session ID and its cookie attributes, for `reserveNumber`
 * to set when a request arrives with none. */
export function createSessionCookie(): SessionCookieAttributes {
  return {
    name: SESSION_COOKIE_NAME,
    value: generateSessionId(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  };
}

/** Resolves the caller's session ID from an existing cookie, minting a new
 * one only if absent — a single request never gets two different session
 * identities depending on which handler looks. */
export function resolveSessionId(cookieHeader: string | null): {
  sessionId: string;
  isNew: boolean;
  cookie: SessionCookieAttributes | null;
} {
  const existing = readSessionId(cookieHeader);
  if (existing) {
    return { sessionId: existing, isNew: false, cookie: null };
  }
  const cookie = createSessionCookie();
  return { sessionId: cookie.value, isNew: true, cookie };
}
