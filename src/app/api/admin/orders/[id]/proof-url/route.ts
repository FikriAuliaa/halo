import { AppError } from "@/lib/errors";
import { ADMIN_PERMISSIONS } from "@/domain/permissions";
import { createHandler } from "@/server/framework/handler";
import {
  adminGetProofUrl,
  createAdminGetProofUrlDeps,
} from "@/server/operations/admin/get-proof-url";

/** `POST /api/admin/orders/{id}/proof-url` (API_SPEC.md, B103). */
export const POST = createHandler(
  { requireRole: ADMIN_PERMISSIONS.adminGetProofUrl },
  async ({ params, admin, logger }) => {
    if (!admin) throw new AppError("UNAUTHENTICATED", "Autentikasi diperlukan.");
    return adminGetProofUrl(params.id!, admin, logger, createAdminGetProofUrlDeps());
  },
);
