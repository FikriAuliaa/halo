import { adminListOrdersQuerySchema } from "@/schemas/order";
import { ADMIN_PERMISSIONS } from "@/domain/permissions";
import { createHandler } from "@/server/framework/handler";
import { adminListOrders, createAdminListOrdersDeps } from "@/server/operations/admin/list-orders";

/** `GET /api/admin/orders` (API_SPEC.md, B101). */
export const GET = createHandler(
  { schema: adminListOrdersQuerySchema, requireRole: ADMIN_PERMISSIONS.adminListOrders },
  async ({ input }) =>
    adminListOrders(
      {
        filters: {
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.university !== undefined ? { university: input.university } : {}),
          ...(input.package_id !== undefined ? { package_id: input.package_id } : {}),
          ...(input.submitted_from !== undefined ? { submitted_from: input.submitted_from } : {}),
          ...(input.submitted_to !== undefined ? { submitted_to: input.submitted_to } : {}),
          ...(input.search !== undefined ? { search: input.search } : {}),
        },
        sort: { field: input.sort_field, direction: input.sort_direction },
        page: input.page,
        limit: input.limit,
      },
      createAdminListOrdersDeps(),
    ),
);
