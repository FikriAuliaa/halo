import { AppError } from "@/lib/errors";
import { adminVerifyPaymentSchema } from "@/schemas/order";
import { ADMIN_PERMISSIONS } from "@/domain/permissions";
import { createHandler } from "@/server/framework/handler";
import {
  adminVerifyPayment,
  createAdminVerifyPaymentDeps,
} from "@/server/operations/admin/verify-payment";

/** `POST /api/admin/orders/{id}/verify` (API_SPEC.md, B104). */
export const POST = createHandler(
  { schema: adminVerifyPaymentSchema, requireRole: ADMIN_PERMISSIONS.adminVerifyPayment },
  async ({ input, params, admin }) => {
    if (!admin) throw new AppError("UNAUTHENTICATED", "Autentikasi diperlukan.");
    return adminVerifyPayment(
      params.id!,
      input.admin_note,
      admin,
      input.idempotency_key,
      createAdminVerifyPaymentDeps(),
    );
  },
);
