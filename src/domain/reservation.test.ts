import { describe, expect, it } from "vitest";
import { ORDER_REF_PATTERN } from "@/lib/id";
import {
  computeReservedUntil,
  isExpired,
  mintOrderRef,
  mintReservationId,
  mintTrackingToken,
} from "./reservation";

describe("mintOrderRef", () => {
  it("matches the documented HALO-XXXXXXXXX pattern", () => {
    expect(mintOrderRef()).toMatch(ORDER_REF_PATTERN);
  });

  it("produces no collisions across 100,000 generations", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100_000; i++) {
      seen.add(mintOrderRef());
    }
    expect(seen.size).toBe(100_000);
  });
});

describe("mintReservationId", () => {
  it("produces no collisions across 10,000 generations", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      seen.add(mintReservationId());
    }
    expect(seen.size).toBe(10_000);
  });
});

describe("mintTrackingToken", () => {
  it("returns a token and a stable hash of it", async () => {
    const { token, hash } = await mintTrackingToken();
    expect(token.length).toBeGreaterThan(0);
    expect(hash.length).toBeGreaterThan(0);
    expect(hash).not.toBe(token);
  });

  it("never lets the plaintext token appear inside its own hash", async () => {
    const { token, hash } = await mintTrackingToken();
    expect(hash).not.toContain(token);
  });

  it("produces a different token (and hash) on every call", async () => {
    const [a, b] = await Promise.all([mintTrackingToken(), mintTrackingToken()]);
    expect(a.token).not.toBe(b.token);
    expect(a.hash).not.toBe(b.hash);
  });
});

describe("computeReservedUntil", () => {
  it("adds the TTL in minutes to the given instant", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const until = computeReservedUntil(now, 15);
    expect(until.getTime() - now.getTime()).toBe(15 * 60_000);
  });
});

describe("isExpired — boundary-correct", () => {
  const until = new Date("2026-01-01T00:15:00.000Z");
  const reservation = { reserved_until: until };

  it("is not expired one millisecond before reserved_until", () => {
    expect(isExpired(reservation, new Date(until.getTime() - 1))).toBe(false);
  });

  it("is expired at exactly reserved_until", () => {
    expect(isExpired(reservation, new Date(until.getTime()))).toBe(true);
  });

  it("is expired one millisecond after reserved_until", () => {
    expect(isExpired(reservation, new Date(until.getTime() + 1))).toBe(true);
  });
});
