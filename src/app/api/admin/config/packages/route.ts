import { AppError } from "@/lib/errors";
import { adminManagePackagesSchema } from "@/schemas/config";
import { ADMIN_PERMISSIONS } from "@/domain/permissions";
import { createHandler } from "@/server/framework/handler";
import { configRepository } from "@/server/repositories/config-repository";
import {
  adminManagePackages,
  createAdminManagePackagesDeps,
} from "@/server/operations/admin/manage-packages";

/** `GET /api/admin/config/packages` (B110) — the admin view, unfiltered
 * (includes inactive packages and `price_status: draft`), unlike the
 * public `getPackages`. `PUT` is a full-document replace. */
export const GET = createHandler(
  { requireRole: ADMIN_PERMISSIONS.adminManagePackages },
  async () => {
    const doc = await configRepository.getPackages();
    return { packages: doc?.packages ?? [] };
  },
);

export const PUT = createHandler(
  { schema: adminManagePackagesSchema, requireRole: ADMIN_PERMISSIONS.adminManagePackages },
  async ({ input, admin }) => {
    if (!admin) throw new AppError("UNAUTHENTICATED", "Autentikasi diperlukan.");
    return adminManagePackages(input, admin, createAdminManagePackagesDeps());
  },
);
