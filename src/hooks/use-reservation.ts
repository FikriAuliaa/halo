"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readFlowState, writeFlowState } from "@/lib/flow-state";

export interface ReservationState {
  number: string | null;
  orderRef: string | null;
  reservedUntil: Date | null;
  loading: boolean;
  error: string | null;
}

export interface ReserveResult {
  number: string;
  order_ref: string;
  reserved_until: string;
  tracking_token: string | null;
}

const FOCUS_REVALIDATE_THROTTLE_MS = 5000;

/**
 * Client-side reservation lifecycle (B074). The server, never this hook,
 * decides validity — `revalidate()` calls `validateReservation` and this
 * only ever *reflects* what comes back. The one thing owned entirely
 * client-side is the clock-offset correction: `now()` is stable
 * (`useCallback`, required by `useCountdown`'s deps) and adjusts for
 * however wrong the device's own clock is, measured once against the
 * server's `now` at reservation time and re-anchored on every
 * revalidation via the server's `remaining_seconds` (a duration, immune
 * to clock skew by construction).
 */
export function useReservation() {
  const [state, setState] = useState<ReservationState>(() => {
    const flow = readFlowState();
    return {
      number: flow.selectedNumber,
      orderRef: flow.orderRef,
      reservedUntil: flow.reservedUntil ? new Date(flow.reservedUntil) : null,
      loading: false,
      error: null,
    };
  });

  const offsetRef = useRef(readFlowState().clockOffsetMs);
  const now = useCallback(() => Date.now() + offsetRef.current, []);

  const reserve = useCallback(async (number: string): Promise<ReserveResult> => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch(`/api/numbers/${number}/reserve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotency_key: crypto.randomUUID() }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error?.message ?? "Gagal melakukan reservasi.");
      }

      const result = body as ReserveResult & { now: string };
      offsetRef.current = new Date(result.now).getTime() - Date.now();
      const reservedUntil = new Date(result.reserved_until);
      writeFlowState({
        selectedNumber: result.number,
        orderRef: result.order_ref,
        reservedUntil: reservedUntil.toISOString(),
        clockOffsetMs: offsetRef.current,
      });
      setState({
        number: result.number,
        orderRef: result.order_ref,
        reservedUntil,
        loading: false,
        error: null,
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal melakukan reservasi.";
      setState((s) => ({ ...s, loading: false, error: message }));
      throw error;
    }
  }, []);

  const revalidate = useCallback(async () => {
    try {
      const res = await fetch("/api/reservations/current");
      if (!res.ok) {
        setState((s) => ({ ...s, reservedUntil: null }));
        return null;
      }
      const body = await res.json();
      if (body.status !== "valid") {
        setState((s) => ({ ...s, reservedUntil: null }));
        return null;
      }
      const reservedUntil = new Date(now() + body.remaining_seconds * 1000);
      writeFlowState({ reservedUntil: reservedUntil.toISOString() });
      setState((s) => ({ ...s, reservedUntil, number: body.number, orderRef: body.order_ref }));
      return body;
    } catch {
      // Network failure — leave the last-known deadline in place rather
      // than treating "couldn't reach the server" as "reservation gone."
      return null;
    }
  }, [now]);

  useEffect(() => {
    let lastRun = 0;
    function trigger() {
      const nowMs = Date.now();
      if (nowMs - lastRun < FOCUS_REVALIDATE_THROTTLE_MS) return;
      lastRun = nowMs;
      void revalidate();
    }
    function onVisibility() {
      if (document.visibilityState === "visible") trigger();
    }
    window.addEventListener("focus", trigger);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", trigger);
    return () => {
      window.removeEventListener("focus", trigger);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", trigger);
    };
  }, [revalidate]);

  return { ...state, now, reserve, revalidate };
}
