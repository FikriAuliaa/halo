import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCountdown } from "./use-countdown";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-20T10:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useCountdown", () => {
  it("computes remaining time accurately against the mocked clock", () => {
    const reservedUntil = new Date("2026-08-20T10:15:00.000Z");
    const { result } = renderHook(() => useCountdown({ reservedUntil }));
    expect(result.current.remainingMs).toBe(15 * 60_000);
    expect(result.current.expired).toBe(false);
  });

  it("recomputes correctly from wall-clock after a simulated 60s tab suspension", () => {
    const reservedUntil = new Date("2026-08-20T10:15:00.000Z");
    const { result } = renderHook(() => useCountdown({ reservedUntil }));
    expect(result.current.remainingMs).toBe(15 * 60_000);

    // Simulate the tab being backgrounded: the system clock jumps forward
    // 60s without any intermediate 1s ticks having actually fired, which
    // is exactly what happens on a real suspended tab / sleeping phone.
    // The subsequent 1s tick both fires the interval AND advances the fake
    // clock a further second, so the true elapsed time is 61s.
    vi.setSystemTime(new Date("2026-08-20T10:01:00.000Z"));
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.remainingMs).toBe(15 * 60_000 - 61_000);
  });

  it("fires onExpire exactly once even when the tab wakes long after expiry", () => {
    const onExpire = vi.fn();
    const reservedUntil = new Date("2026-08-20T10:15:00.000Z");
    renderHook(() => useCountdown({ reservedUntil, onExpire }));

    // Jump far past expiry in one leap (simulating a long-suspended tab),
    // then let several more ticks fire.
    vi.setSystemTime(new Date("2026-08-20T11:00:00.000Z"));
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("reports expired true once remaining time reaches zero", () => {
    const reservedUntil = new Date("2026-08-20T10:00:05.000Z");
    const { result } = renderHook(() => useCountdown({ reservedUntil }));
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(result.current.expired).toBe(true);
    expect(result.current.remainingMs).toBe(0);
  });

  it("never reports negative remaining time (clock skew in the expired direction)", () => {
    const reservedUntil = new Date("2026-08-20T09:59:00.000Z"); // already in the past
    const { result } = renderHook(() => useCountdown({ reservedUntil }));
    expect(result.current.remainingMs).toBe(0);
    expect(result.current.expired).toBe(true);
  });
});
