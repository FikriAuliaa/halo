/**
 * CSPRNG-backed identifier generation (ADR-005). Uses the Web Crypto API
 * (`crypto.getRandomValues`/`crypto.subtle`), not `Math.random()` anywhere
 * — Web Crypto is available globally in both Node and the browser, which
 * keeps this module usable from src/lib's cross-cutting position without
 * pulling in `node:crypto` (which would break if this ever ended up in a
 * client bundle).
 */

// Crockford's Base32 alphabet: excludes I, L, O, U to avoid visual
// ambiguity (1/I/l, 0/O) when a student reads the code aloud or copies it
// by hand.
const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function randomAlphabetString(length: number, alphabet: string): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let result = "";
  for (const byte of bytes) {
    // Modulo bias is negligible here: alphabet length 32 is a power of two,
    // so `byte % 32` is exactly uniform over a full 0-255 byte range.
    result += alphabet[byte % alphabet.length];
  }
  return result;
}

/** `HALO-XXXXXXXXX` — public, low-guessability identifier. Not a secret. */
export function generateOrderRef(): string {
  return `HALO-${randomAlphabetString(9, CROCKFORD_ALPHABET)}`;
}

export const ORDER_REF_PATTERN = /^HALO-[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{9}$/;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** 32 random bytes, base64url-encoded — the tracking secret (ADR-005). */
export function generateTrackingToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

/** Opaque session identifier, carried only in the httpOnly cookie. */
export function generateSessionId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

/** Opaque reservation identifier (B062) — lets `validateReservation`
 * distinguish "this session's own reservation, still live" from "the
 * number now belongs to a different reservation" (`taken_over`) without
 * relying on `order_ref`/`session_id` alone. */
export function generateReservationId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

/** SHA-256 of a tracking token — only this, never the plaintext, is stored. */
export async function hashTrackingToken(token: string): Promise<string> {
  const encoded = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return toBase64Url(new Uint8Array(digest));
}
