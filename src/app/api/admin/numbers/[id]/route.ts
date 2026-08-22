import { AppError } from "@/lib/errors";
import { adminUpdateNumberSchema } from "@/schemas/number";
import { ADMIN_PERMISSIONS } from "@/domain/permissions";
import { createHandler } from "@/server/framework/handler";
import {
  adminRemoveNumber,
  createAdminRemoveNumberDeps,
} from "@/server/operations/admin/numbers/remove-number";
import {
  adminUpdateNumber,
  createAdminUpdateNumberDeps,
} from "@/server/operations/admin/numbers/update-number";

export const DELETE = createHandler(
  { requireRole: ADMIN_PERMISSIONS.adminRemoveNumber },
  async ({ params, admin }) => {
    if (!admin) throw new AppError("UNAUTHENTICATED", "Autentikasi diperlukan.");
    return adminRemoveNumber({ number: params.id! }, admin, createAdminRemoveNumberDeps());
  },
);

export const PATCH = createHandler(
  { schema: adminUpdateNumberSchema, requireRole: ADMIN_PERMISSIONS.adminUpdateNumber },
  async ({ input, params, admin }) => {
    if (!admin) throw new AppError("UNAUTHENTICATED", "Autentikasi diperlukan.");
    return adminUpdateNumber(
      {
        number: params.id!,
        reason: input.reason,
        ...(input.number !== undefined ? { correctedNumber: input.number } : {}),
      },
      admin,
      createAdminUpdateNumberDeps(),
    );
  },
);
