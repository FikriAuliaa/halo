"use client";

/**
 * Client-side ordering-flow convenience state (B071) — `sessionStorage`,
 * never `localStorage` (cleared when the tab closes, matching how far a
 * student's PII should ever persist client-side unattended). This is
 * **not** the source of truth for anything the server must be
 * authoritative about: reservation validity always comes from
 * `validateReservation`, never from this object. Losing this state (a
 * cleared tab, a different browser) only costs the student having to
 * re-pick a package/re-type the form — never a security or correctness
 * issue, since every mutating request is re-validated server-side anyway.
 */

const STORAGE_KEY = "halo_flow_state";

export interface FlowState {
  selectedNumber: string | null;
  selectedPackageId: string | null;
  orderRef: string | null;
  reservedUntil: string | null;
  /** `serverNow - Date.now()` at the moment `reservedUntil` was last set —
   * lets the countdown stay correct even on a device with a wrong clock. */
  clockOffsetMs: number;
}

const EMPTY_STATE: FlowState = {
  selectedNumber: null,
  selectedPackageId: null,
  orderRef: null,
  reservedUntil: null,
  clockOffsetMs: 0,
};

export function readFlowState(): FlowState {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    return { ...EMPTY_STATE, ...(JSON.parse(raw) as Partial<FlowState>) };
  } catch {
    return EMPTY_STATE;
  }
}

export function writeFlowState(patch: Partial<FlowState>): FlowState {
  const next = { ...readFlowState(), ...patch };
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function clearFlowState(): void {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(STORAGE_KEY);
  }
}
