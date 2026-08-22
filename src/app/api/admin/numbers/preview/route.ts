import { adminAddNumbersSchema } from "@/schemas/number";
import { ADMIN_PERMISSIONS } from "@/domain/permissions";
import { createHandler } from "@/server/framework/handler";
import {
  adminPreviewAddNumbers,
  createAdminPreviewAddNumbersDeps,
} from "@/server/operations/admin/numbers/preview-add-numbers";

/** `POST /api/admin/numbers/preview` (B107) — same permission as the
 * commit endpoint it previews (`ADMIN_PERMISSIONS.adminAddNumbers`),
 * since previewing is part of the same user-facing capability. */
export const POST = createHandler(
  { schema: adminAddNumbersSchema, requireRole: ADMIN_PERMISSIONS.adminAddNumbers },
  async ({ input }) => adminPreviewAddNumbers(input, createAdminPreviewAddNumbersDeps()),
);
