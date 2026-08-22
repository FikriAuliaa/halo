import { adminAddNumbersSchema, adminListNumbersQuerySchema } from "@/schemas/number";
import { ADMIN_PERMISSIONS } from "@/domain/permissions";
import { createHandler } from "@/server/framework/handler";
import { AppError } from "@/lib/errors";
import {
  adminAddNumbers,
  createAdminAddNumbersDeps,
} from "@/server/operations/admin/numbers/add-numbers";
import {
  adminListNumbers,
  createAdminListNumbersDeps,
} from "@/server/operations/admin/numbers/list-numbers";

export const GET = createHandler(
  { schema: adminListNumbersQuerySchema, requireRole: ADMIN_PERMISSIONS.adminListNumbers },
  async ({ input }) => adminListNumbers(input, createAdminListNumbersDeps()),
);

export const POST = createHandler(
  { schema: adminAddNumbersSchema, requireRole: ADMIN_PERMISSIONS.adminAddNumbers },
  async ({ input, admin }) => {
    if (!admin) throw new AppError("UNAUTHENTICATED", "Autentikasi diperlukan.");
    return adminAddNumbers(input, admin, createAdminAddNumbersDeps());
  },
);
