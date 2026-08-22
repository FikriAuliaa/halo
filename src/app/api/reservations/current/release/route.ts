import {
  createReleaseReservationDeps,
  releaseReservation,
} from "@/server/operations/release-reservation";
import { createHandler } from "@/server/framework/handler";
import { reservationReleased } from "@/server/observability/events";

/** `POST /api/reservations/current/release` (API_SPEC.md, B065). */
export const POST = createHandler({}, async ({ sessionId, logger }) => {
  const result = await releaseReservation(sessionId, createReleaseReservationDeps());
  if (result.released && result.number) {
    await reservationReleased(logger, { number: result.number, sessionId });
  }
  return result;
});
