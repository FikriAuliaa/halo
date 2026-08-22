import { NUMBER_STATUSES, type NumberStatus } from "./status";
import { AppError } from "@/lib/errors";

/**
 * The five-state lifecycle as an explicit data structure (ADR-003, B059) —
 * every one of the 5×5 (state, state) pairs is covered, with no implicit
 * default. `src/server/operations/*` calls `assertTransition` before every
 * status write; no operation encodes this table itself.
 */
export type NumberActor = "system" | "student" | "ADMIN_KAMPUS" | "ADMIN_TELKOMSEL";

export interface TransitionRule {
  from: NumberStatus;
  to: NumberStatus;
  actors: readonly NumberActor[];
  trigger: string;
}

// The complete legal-transition list per ADR-003. Every (from, to) pair not
// listed here is illegal via any standard operation — reachable only
// through the manual admin correction path (`adminUpdateNumber`), which is
// deliberately not represented as a "standard" transition in this table.
const TRANSITIONS: readonly TransitionRule[] = [
  { from: "available", to: "reserved", actors: ["student"], trigger: "reserveNumber" },
  { from: "reserved", to: "pending", actors: ["student"], trigger: "submitOrder" },
  {
    from: "reserved",
    to: "available",
    actors: ["system", "student"],
    trigger: "TTL expiry (lazy or janitor) or voluntary release",
  },
  {
    from: "pending",
    to: "sold",
    actors: ["ADMIN_KAMPUS", "ADMIN_TELKOMSEL"],
    trigger: "adminVerifyPayment",
  },
  {
    from: "pending",
    to: "available",
    actors: ["ADMIN_KAMPUS", "ADMIN_TELKOMSEL"],
    trigger: "adminRejectPayment",
  },
  {
    from: "available",
    to: "sold_offline",
    actors: ["ADMIN_TELKOMSEL"],
    trigger: "adminMarkSoldOffline",
  },
] as const;

/** Every (from, to) pair, including same-state pairs, which are never a
 * real transition and are always illegal here — exhaustive over all 25. */
export function canTransition(from: NumberStatus, to: NumberStatus, actor: NumberActor): boolean {
  if (from === to) return false;
  return TRANSITIONS.some(
    (rule) => rule.from === from && rule.to === to && rule.actors.includes(actor),
  );
}

export function assertTransition(from: NumberStatus, to: NumberStatus, actor: NumberActor): void {
  if (canTransition(from, to, actor)) return;
  throw new AppError("CONFLICT", `Tidak dapat mengubah status dari ${from} ke ${to}.`);
}

/** Every legal destination status from `status`, for the given actor —
 * drives which admin actions render as available (B059). */
export function getAvailableActions(status: NumberStatus, actor: NumberActor): NumberStatus[] {
  return TRANSITIONS.filter((rule) => rule.from === status && rule.actors.includes(actor)).map(
    (rule) => rule.to,
  );
}

/**
 * The single place lazy expiry is computed (ADR-004) — imported by both
 * the query path (`getAvailableNumbers`) and the reservation path
 * (`reserveNumber`'s transactional guard), so the two can never disagree
 * about whether a given document is "really" available right now.
 */
export function getEffectiveStatus(
  doc: { status: NumberStatus; reserved_until: Date | null },
  now: Date,
): NumberStatus {
  if (doc.status === "reserved" && doc.reserved_until !== null && doc.reserved_until <= now) {
    return "available";
  }
  return doc.status;
}

/** Every (from, to) pair with its verdict — used by the exhaustive test
 * and available for any caller that wants the full picture rather than a
 * single yes/no. */
export function fullTransitionMatrix(): Array<{
  from: NumberStatus;
  to: NumberStatus;
  legalFor: NumberActor[];
}> {
  const actors: NumberActor[] = ["system", "student", "ADMIN_KAMPUS", "ADMIN_TELKOMSEL"];
  const result: Array<{ from: NumberStatus; to: NumberStatus; legalFor: NumberActor[] }> = [];
  for (const from of NUMBER_STATUSES) {
    for (const to of NUMBER_STATUSES) {
      result.push({
        from,
        to,
        legalFor: actors.filter((actor) => canTransition(from, to, actor)),
      });
    }
  }
  return result;
}
