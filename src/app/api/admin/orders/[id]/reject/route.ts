import { AppError } from "@/lib/errors";
import { adminRejectPaymentSchema } from "@/schemas/order";
import { ADMIN_PERMISSIONS } from "@/domain/permissions";
import { createHandler } from "@/server/framework/handler";
import {
  adminRejectPayment,
  createAdminRejectPaymentDeps,
} from "@/server/operations/admin/reject-payment";

/** `POST /api/admin/orders/{id}/reject` (API_SPEC.md, B104). */
export const POST = createHandler(
  { schema: adminRejectPaymentSchema, requireRole: ADMIN_PERMISSIONS.adminRejectPayment },
  async ({ input, params, admin }) => {
    if (!admin) throw new AppError("UNAUTHENTICATED", "Autentikasi diperlukan.");
    return adminRejectPayment(
      params.id!,
      input.admin_note,
      admin,
      input.idempotency_key,
      createAdminRejectPaymentDeps(),
    );
  },
);
