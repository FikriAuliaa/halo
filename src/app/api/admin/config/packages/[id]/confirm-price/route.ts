import { AppError } from "@/lib/errors";
import { ADMIN_PERMISSIONS } from "@/domain/permissions";
import { createHandler } from "@/server/framework/handler";
import {
  adminConfirmPackagePrice,
  createAdminConfirmPackagePriceDeps,
} from "@/server/operations/admin/confirm-package-price";

/** `POST /api/admin/config/packages/{id}/confirm-price` (B110, OQ-1). */
export const POST = createHandler(
  { requireRole: ADMIN_PERMISSIONS.adminConfirmPackagePrice },
  async ({ params, admin }) => {
    if (!admin) throw new AppError("UNAUTHENTICATED", "Autentikasi diperlukan.");
    return adminConfirmPackagePrice(params.id!, admin, createAdminConfirmPackagePriceDeps());
  },
);
