import { adminRunCleanup } from "@/server/operations/admin/cleanup";
import { ADMIN_PERMISSIONS } from "@/domain/permissions";
import { createHandler } from "@/server/framework/handler";
import { cleanupRun } from "@/server/observability/events";

/** `POST /api/admin/cleanup/run` (API_SPEC.md, B068). */
export const POST = createHandler(
  { requireRole: ADMIN_PERMISSIONS.adminRunCleanup },
  async ({ logger }) => {
    const start = Date.now();
    const summary = await adminRunCleanup();
    cleanupRun(logger, { ...summary, durationMs: Date.now() - start });
    return summary;
  },
);
