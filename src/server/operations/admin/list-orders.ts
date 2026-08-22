import {
  OrderRepository,
  type OrderListFilters,
  type OrderSortDirection,
  type OrderSortField,
} from "@/server/repositories/order-repository";

/** The admin order-list projection — excludes the proof path and the
 * tracking hash (B101): neither belongs in a list view, and the proof
 * path specifically is only ever resolved into a short-lived signed URL
 * on demand (`adminGetProofUrl`, B103), never handed out in bulk. */
export interface AdminOrderListItem {
  id: string;
  order_ref: string;
  number: string;
  full_name: string;
  university: string;
  package_id: string;
  status: string;
  submitted_at: string;
  verified_at: string | null;
}

export interface AdminListOrdersResult {
  items: AdminOrderListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminListOrdersInput {
  filters: OrderListFilters;
  sort: { field: OrderSortField; direction: OrderSortDirection };
  page: number;
  limit: number;
}

export async function adminListOrders(
  input: AdminListOrdersInput,
  deps: { orderRepo: OrderRepository },
): Promise<AdminListOrdersResult> {
  const result = await deps.orderRepo.list(input.filters, input.sort, {
    page: input.page,
    limit: input.limit,
  });

  return {
    items: result.items.map((row) => ({
      id: row.id,
      order_ref: row.order_ref,
      number: row.number,
      full_name: row.full_name,
      university: row.university,
      package_id: row.package_id,
      status: row.status,
      submitted_at: row.submitted_at.toISOString(),
      verified_at: row.verified_at ? row.verified_at.toISOString() : null,
    })),
    total: result.total,
    page: result.page,
    limit: result.limit,
  };
}

export function createAdminListOrdersDeps() {
  return { orderRepo: new OrderRepository() };
}
