import { ADMIN_PERMISSIONS } from "@/domain/permissions";
import { createHandler } from "@/server/framework/handler";
import { adminGetDashboardMetrics } from "@/server/operations/admin/dashboard-metrics";

/** `GET /api/admin/dashboard` (B099). Reuses `adminListOrders`'s implicit
 * "any admin" visibility — dashboard metrics aren't role-restricted. */
export const GET = createHandler({ requireRole: ADMIN_PERMISSIONS.adminListOrders }, async () =>
  adminGetDashboardMetrics(),
);
