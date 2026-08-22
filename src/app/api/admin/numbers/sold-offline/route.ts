import { AppError } from "@/lib/errors";
import { adminMarkSoldOfflineSchema } from "@/schemas/admin";
import { ADMIN_PERMISSIONS } from "@/domain/permissions";
import { createHandler } from "@/server/framework/handler";
import {
  adminMarkSoldOffline,
  createAdminMarkSoldOfflineDeps,
} from "@/server/operations/admin/numbers/mark-sold-offline";

/**
 * Bulk-only (RUNBOOK.md §10, OPERATIONS.md's recap procedure) — no `{id}`
 * path segment, unlike API_SPEC.md's original single-number sketch. The
 * shared schema and every operations doc already agree on bulk;
 * API_SPEC.md is updated to match (B058).
 */
export const POST = createHandler(
  { schema: adminMarkSoldOfflineSchema, requireRole: ADMIN_PERMISSIONS.adminMarkSoldOffline },
  async ({ input, admin }) => {
    if (!admin) throw new AppError("UNAUTHENTICATED", "Autentikasi diperlukan.");
    return adminMarkSoldOffline(input, admin, createAdminMarkSoldOfflineDeps());
  },
);
