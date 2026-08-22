import { AppError } from "@/lib/errors";
import { reserveNumberSchema } from "@/schemas/number";
import { createHandler } from "@/server/framework/handler";
import { checkRateLimit, hashIp } from "@/server/framework/rate-limit";
import { createReserveNumberDeps, reserveNumber } from "@/server/operations/reserve-number";
import { reservationCreated, reservationFailed } from "@/server/observability/events";

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/** `POST /api/numbers/{id}/reserve` (API_SPEC.md; the block text's sketch
 * of `POST /api/reservations` was superseded by this, along with
 * `ARCHITECTURE.md`'s sequence diagram, which both already agreed on the
 * number-scoped path before this operation was implemented). No auth —
 * the session cookie is minted here if absent. Primary limit is per
 * *session* (API_SPEC.md: 10/min) — the number-scoped path is already
 * resistant to cross-session enumeration abuse the anonymous public
 * listing isn't. A much looser per-IP limit sits behind it (B115):
 * `sessionId` is a client-supplied cookie value with nothing stopping a
 * script from generating a fresh one per request to reset the per-session
 * budget every time, so the per-session limit alone doesn't actually
 * bound one actor's total reservation churn. 100/min per IP is sized to
 * never bother a shared-NAT campus network full of real students each
 * well within their own 10/min budget, while still capping a single
 * address minting sessions to bypass that budget. */
export const POST = createHandler(
  { schema: reserveNumberSchema },
  async ({ input, params, sessionId, request, logger }) => {
    const ipHash = await hashIp(clientIp(request));
    const perIp = await checkRateLimit(
      ipHash,
      { operation: "reserveNumberByIp", limit: 100, windowSeconds: 60 },
      logger,
    );
    if (!perIp.allowed) {
      throw new AppError(
        "RATE_LIMITED",
        "Terlalu banyak percobaan reservasi. Coba lagi sebentar lagi.",
      );
    }

    const rateLimit = await checkRateLimit(
      sessionId,
      { operation: "reserveNumber", limit: 10, windowSeconds: 60 },
      logger,
    );
    if (!rateLimit.allowed) {
      throw new AppError(
        "RATE_LIMITED",
        "Terlalu banyak percobaan reservasi. Coba lagi sebentar lagi.",
      );
    }

    const number = params.id!;
    try {
      const result = await reserveNumber(
        { number, sessionId, idempotencyKey: input.idempotency_key },
        createReserveNumberDeps(),
      );
      await reservationCreated(logger, { number, sessionId, orderRef: result.order_ref });
      return result;
    } catch (error) {
      if (error instanceof AppError) {
        await reservationFailed(logger, { number, sessionId, reason: error.code });
      }
      throw error;
    }
  },
);
