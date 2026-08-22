"use client";

import { useEffect, useRef, useState } from "react";

export interface UseCountdownOptions {
  /** Server-authoritative expiry instant. The timer is presentation only —
   * this value is truth, never a client-computed duration (ADR-004,
   * DESIGN.md §8). */
  reservedUntil: Date;
  /** Fired exactly once when remaining time reaches zero. Idempotent by
   * construction: an internal ref guards against a second invocation even
   * if the tick fires again after expiry (e.g. on tab wake). */
  onExpire?: (() => void) | undefined;
  /** Defaults to `Date.now`. `useReservation` (B074) passes a clock-offset-
   * corrected version instead, so a device with a wrong clock still counts
   * down accurately against the server-authoritative `reservedUntil`. */
  now?: (() => number) | undefined;
}

export interface UseCountdownResult {
  remainingMs: number;
  expired: boolean;
}

/**
 * Recomputes remaining time from wall-clock (`Date.now()` vs. the absolute
 * `reservedUntil` instant) on every tick — never by decrementing a stored
 * counter. This is what makes it correct across a backgrounded tab or a
 * sleeping phone: whenever the timer next gets to run, it derives the true
 * remaining time immediately, rather than resuming from a stale value.
 */
export function useCountdown({
  reservedUntil,
  onExpire,
  now = Date.now,
}: UseCountdownOptions): UseCountdownResult {
  const compute = () => Math.max(0, reservedUntil.getTime() - now());
  const [remainingMs, setRemainingMs] = useState(compute);
  const hasFiredExpireRef = useRef(false);

  useEffect(() => {
    hasFiredExpireRef.current = false;
    setRemainingMs(compute());

    const tick = () => {
      const next = compute();
      setRemainingMs(next);
      if (next <= 0 && !hasFiredExpireRef.current) {
        hasFiredExpireRef.current = true;
        onExpire?.();
      }
    };

    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
    // `compute` is intentionally omitted: it's a fresh closure over
    // `reservedUntil`/`now` recreated every render, so depending on it
    // directly would re-run this effect every render and defeat its own
    // purpose. Callers must pass a stable `now` (e.g. `useCallback`) for
    // the same reason `reservedUntil` must be a stable Date reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservedUntil, onExpire, now]);

  return { remainingMs, expired: remainingMs <= 0 };
}
