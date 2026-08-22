import { getEffectiveStatus } from "@/domain/number-status";
import { NumberRepository } from "@/server/repositories/number-repository";
import { requireSession } from "@/server/session/session";

export type ValidateReservationResult =
  | {
      status: "valid";
      number: string;
      reserved_until: string;
      order_ref: string;
      remaining_seconds: number;
    }
  | { status: "expired"; number: string }
  | { status: "not_found" }
  | { status: "taken_over"; number: string };

export interface ValidateReservationDeps {
  numberRepo: NumberRepository;
}

export function createValidateReservationDeps(): ValidateReservationDeps {
  return { numberRepo: new NumberRepository() };
}

/**
 * `validateReservation` (B064) — read-only, never extends or repairs
 * anything; every subsequent ordering-flow step calls this before
 * rendering. Returns the full four-state union always; it never throws
 * for `not_found`/`expired`/`taken_over` — those are expected outcomes a
 * caller inspects, not exceptional control flow. The Route Handler
 * (`GET /api/reservations/current`, API_SPEC.md) is the layer that maps
 * `not_found`/`expired` onto thrown `RESERVATION_NOT_FOUND`/
 * `RESERVATION_EXPIRED` to match the documented HTTP contract.
 */
export async function validateReservation(
  sessionId: string,
  deps: ValidateReservationDeps,
): Promise<ValidateReservationResult> {
  const session = await requireSession(sessionId);
  const currentReservation = session?.current_reservation ?? null;
  if (currentReservation === null) {
    return { status: "not_found" };
  }

  const { number, reservation_id: reservationId } = currentReservation;
  const numberRow = await deps.numberRepo.get(number);
  if (numberRow === null) {
    return { status: "not_found" };
  }

  const now = new Date();

  if (numberRow.reservation_id === reservationId) {
    const effectiveStatus = getEffectiveStatus(numberRow, now);
    // `pending` (the student has since submitted the order) still counts
    // as valid here — the reservation record itself remains correct.
    if (effectiveStatus === "reserved" || numberRow.status === "pending") {
      return {
        status: "valid",
        number,
        reserved_until: numberRow.reserved_until!.toISOString(),
        order_ref: numberRow.order_ref!,
        remaining_seconds: Math.max(
          0,
          Math.round((numberRow.reserved_until!.getTime() - now.getTime()) / 1000),
        ),
      };
    }
    return { status: "expired", number };
  }

  // A different, non-null reservation now occupies this number — a
  // genuine takeover, not a simple lapse.
  if (numberRow.reservation_id !== null) {
    return { status: "taken_over", number };
  }
  return { status: "expired", number };
}
