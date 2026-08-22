import { AppError } from "@/lib/errors";
import {
  createValidateReservationDeps,
  validateReservation,
} from "@/server/operations/validate-reservation";
import { createHandler } from "@/server/framework/handler";
import { reservationExpired, reservationTakenOver } from "@/server/observability/events";

/** `GET /api/reservations/current` (API_SPEC.md, B064). Maps the
 * operation's `not_found`/`expired` outcomes onto thrown errors to match
 * the documented HTTP contract; `valid`/`taken_over` pass through as a
 * normal 200 response with `status` in the body. */
export const GET = createHandler({}, async ({ sessionId, logger }) => {
  const result = await validateReservation(sessionId, createValidateReservationDeps());

  if (result.status === "not_found") {
    throw new AppError("RESERVATION_NOT_FOUND", "Tidak ada reservasi aktif untuk sesi ini.");
  }
  if (result.status === "expired") {
    reservationExpired(logger, { number: result.number });
    throw new AppError("RESERVATION_EXPIRED", "Reservasi Anda telah berakhir.");
  }
  if (result.status === "taken_over") {
    reservationTakenOver(logger, { number: result.number });
  }

  return result;
});
