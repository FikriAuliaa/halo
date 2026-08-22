import { AppError } from "@/lib/errors";
import { getAvailableNumbersQuerySchema } from "@/schemas/number";
import { createHandler } from "@/server/framework/handler";
import { checkRateLimit, hashIp } from "@/server/framework/rate-limit";
import {
  createGetAvailableNumbersDeps,
  getAvailableNumbers,
} from "@/server/operations/get-available-numbers";

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export const GET = createHandler(
  { schema: getAvailableNumbersQuerySchema },
  async ({ input, request, logger }) => {
    const ipHash = await hashIp(clientIp(request));
    const rateLimit = await checkRateLimit(
      ipHash,
      { operation: "getAvailableNumbers", limit: 60, windowSeconds: 60 },
      logger,
    );
    if (!rateLimit.allowed) {
      throw new AppError("RATE_LIMITED", "Terlalu banyak permintaan. Coba lagi sebentar lagi.");
    }

    return getAvailableNumbers(input, createGetAvailableNumbersDeps());
  },
);
