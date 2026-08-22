import { ADMIN_PERMISSIONS } from "@/domain/permissions";
import { createHandler } from "@/server/framework/handler";
import { adminGetOrder, createAdminGetOrderDeps } from "@/server/operations/admin/get-order";

/** `GET /api/admin/orders/{id}` (API_SPEC.md, B103). */
export const GET = createHandler(
  { requireRole: ADMIN_PERMISSIONS.adminGetOrder },
  async ({ params }) => adminGetOrder(params.id!, createAdminGetOrderDeps()),
);
