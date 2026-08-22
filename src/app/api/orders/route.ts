import { AppError } from "@/lib/errors";
import { orderFormSchema } from "@/schemas/order";
import { createHandler } from "@/server/framework/handler";
import { checkRateLimit } from "@/server/framework/rate-limit";
import { createSubmitOrderDeps, submitOrder } from "@/server/operations/submit-order";

/** `POST /api/orders` (API_SPEC.md, B085) — multipart/form-data, so it
 * skips `createHandler`'s JSON `schema` option and parses the body
 * itself via `request.formData()`. */
export const POST = createHandler(
  { successStatus: 201 },
  async ({ request, sessionId, logger }) => {
    const rateLimit = await checkRateLimit(
      sessionId,
      { operation: "submitOrder", limit: 5, windowSeconds: 60 },
      logger,
    );
    if (!rateLimit.allowed) {
      throw new AppError("RATE_LIMITED", "Terlalu banyak percobaan. Coba lagi sebentar lagi.");
    }

    const formData = await request.formData();

    const proofFile = formData.get("proof");
    if (!(proofFile instanceof File)) {
      throw new AppError("VALIDATION_FAILED", "Bukti pembayaran wajib diunggah.", "proof");
    }

    const idempotencyKey = formData.get("idempotency_key");
    if (typeof idempotencyKey !== "string" || idempotencyKey.length === 0) {
      throw new AppError("VALIDATION_FAILED", "idempotency_key wajib diisi.", "idempotency_key");
    }

    const parsed = orderFormSchema.safeParse({
      full_name: formData.get("full_name"),
      university: formData.get("university"),
      whatsapp: formData.get("whatsapp"),
      email: formData.get("email"),
      package_id: formData.get("package_id"),
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path[0];
      throw new AppError(
        "VALIDATION_FAILED",
        issue?.message ?? "Data tidak valid.",
        typeof field === "string" ? field : null,
      );
    }

    return submitOrder(
      { sessionId, idempotencyKey, form: parsed.data, proofFile },
      createSubmitOrderDeps(logger),
    );
  },
);
