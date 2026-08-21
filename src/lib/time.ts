/**
 * A minimal injectable clock. Nothing in src/domain is allowed to call
 * `Date.now()`/`new Date()` directly (see src/domain/README.md) — every
 * pure function that needs "now" takes a `Clock` (or a plain `Date`)
 * parameter instead, so reservation-expiry logic is fully deterministic and
 * testable without waiting on a real clock or mocking global time.
 *
 * The actual authoritative timestamp for any Firestore write is a
 * server-side `Timestamp.now()` read inside a transaction (ADR-004,
 * src/server) — this module has no opinion about that; it only exists so
 * src/domain's pure functions have something to depend on instead of the
 * ambient system clock.
 */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

export function fixedClock(at: Date): Clock {
  return { now: () => at };
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function isBeforeOrEqual(a: Date, b: Date): boolean {
  return a.getTime() <= b.getTime();
}
