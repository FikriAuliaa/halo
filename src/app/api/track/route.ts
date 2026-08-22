import { AppError } from "@/lib/errors";
import { trackingLookupSchema } from "@/schemas/order";
import { createHandler } from "@/server/framework/handler";
import { checkRateLimit, hashIp } from "@/server/framework/rate-limit";
import {
  createGetTrackingStatusDeps,
  getTrackingStatus,
} from "@/server/operations/get-tracking-status";

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/** `POST /api/track` (API_SPEC.md). Rate-limited on two independent
 * buckets — per IP and per `order_ref` — both failing **closed**
 * (ADR-005: this guards a secret token, a fairness control isn't the
 * point). A caller rotating IPs still can't brute-force one specific ref. */
export const POST = createHandler(
  { schema: trackingLookupSchema },
  async ({ input, request, logger }) => {
    const ipHash = await hashIp(clientIp(request));

    const perIp = await checkRateLimit(
      ipHash,
      { operation: "getTrackingStatus", limit: 20, windowSeconds: 60, failClosed: true },
      logger,
    );
    if (!perIp.allowed) {
      throw new AppError("RATE_LIMITED", "Terlalu banyak permintaan. Coba lagi sebentar lagi.");
    }

    const perRef = await checkRateLimit(
      `ref:${input.order_ref}`,
      { operation: "getTrackingStatus", limit: 20, windowSeconds: 60, failClosed: true },
      logger,
    );
    if (!perRef.allowed) {
      throw new AppError("RATE_LIMITED", "Terlalu banyak permintaan. Coba lagi sebentar lagi.");
    }

    return getTrackingStatus(input, createGetTrackingStatusDeps());
  },
);
