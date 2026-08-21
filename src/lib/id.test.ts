import { describe, expect, it } from "vitest";
import {
  generateOrderRef,
  generateReservationId,
  generateSessionId,
  generateTrackingToken,
  hashTrackingToken,
  ORDER_REF_PATTERN,
} from "./id";

describe("generateOrderRef", () => {
  it("matches the HALO-XXXXXXXXX Crockford Base32 pattern", () => {
    expect(generateOrderRef()).toMatch(ORDER_REF_PATTERN);
  });

  it("never contains the excluded ambiguous characters I, L, O, U in its random suffix", () => {
    for (let i = 0; i < 1000; i++) {
      const suffix = generateOrderRef().slice("HALO-".length);
      expect(suffix).not.toMatch(/[ILOU]/);
    }
  });

  it("produces no collisions across 10,000 generations", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      seen.add(generateOrderRef());
    }
    expect(seen.size).toBe(10_000);
  });
});

describe("generateTrackingToken", () => {
  it("is base64url (no +, /, or padding =)", () => {
    const token = generateTrackingToken();
    expect(token).not.toMatch(/[+/=]/);
  });

  it("decodes to 32 bytes of entropy", () => {
    const token = generateTrackingToken();
    const padded = token.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    expect(bytes.length).toBe(32);
  });

  it("produces no collisions across 10,000 generations", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      seen.add(generateTrackingToken());
    }
    expect(seen.size).toBe(10_000);
  });
});

describe("generateSessionId", () => {
  it("produces no collisions across 10,000 generations", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      seen.add(generateSessionId());
    }
    expect(seen.size).toBe(10_000);
  });
});

describe("generateReservationId", () => {
  it("produces no collisions across 10,000 generations", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      seen.add(generateReservationId());
    }
    expect(seen.size).toBe(10_000);
  });
});

describe("hashTrackingToken", () => {
  it("is deterministic for the same input", async () => {
    const token = generateTrackingToken();
    const [a, b] = await Promise.all([hashTrackingToken(token), hashTrackingToken(token)]);
    expect(a).toBe(b);
  });

  it("differs for different inputs", async () => {
    const [a, b] = await Promise.all([
      hashTrackingToken(generateTrackingToken()),
      hashTrackingToken(generateTrackingToken()),
    ]);
    expect(a).not.toBe(b);
  });

  it("never reveals the plaintext token as a substring of its hash", async () => {
    const token = generateTrackingToken();
    const hash = await hashTrackingToken(token);
    expect(hash).not.toContain(token);
  });
});
