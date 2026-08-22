import { AppError } from "@/lib/errors";
import { adminManageUniversitiesSchema } from "@/schemas/config";
import { ADMIN_PERMISSIONS } from "@/domain/permissions";
import { createHandler } from "@/server/framework/handler";
import { configRepository } from "@/server/repositories/config-repository";
import {
  adminManageUniversities,
  createAdminManageUniversitiesDeps,
} from "@/server/operations/admin/manage-universities";

/** `GET /api/admin/config/universities` (B111) — the admin view,
 * unfiltered (includes inactive). `PUT` is a full-document replace;
 * omitting an existing name is the delete, refused if any order
 * references it. */
export const GET = createHandler(
  { requireRole: ADMIN_PERMISSIONS.adminManageUniversities },
  async () => {
    const doc = await configRepository.getUniversities();
    return { list: doc?.list ?? [] };
  },
);

export const PUT = createHandler(
  { schema: adminManageUniversitiesSchema, requireRole: ADMIN_PERMISSIONS.adminManageUniversities },
  async ({ input, admin }) => {
    if (!admin) throw new AppError("UNAUTHENTICATED", "Autentikasi diperlukan.");
    return adminManageUniversities(input, admin, createAdminManageUniversitiesDeps());
  },
);
