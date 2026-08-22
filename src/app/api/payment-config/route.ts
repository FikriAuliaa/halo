import { createHandler } from "@/server/framework/handler";
import { getPaymentConfig } from "@/server/operations/get-payment-config";

/** `GET /api/payment-config` (API_SPEC.md, B081). No auth. */
export const GET = createHandler({}, async () => getPaymentConfig());
