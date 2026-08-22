import { AppError } from "@/lib/errors";
import { OrderRepository } from "@/server/repositories/order-repository";
import { configRepository } from "@/server/repositories/config-repository";

export interface AdminOrderDetail {
  id: string;
  order_ref: string;
  number: string;
  full_name: string;
  university: string;
  whatsapp: string;
  email: string;
  package_id: string;
  package_label: string;
  price_at_order: number;
  status: string;
  submitted_at: string;
  verified_at: string | null;
  verified_by: string | null;
  admin_note: string | null;
}

/** `adminGetOrder` (B103) — full detail; proof URL is resolved
 * separately (`adminGetProofUrl`), never bundled here, so viewing the
 * list-to-detail path never mints a signed URL for a proof no one asked
 * to see yet. */
export async function adminGetOrder(
  orderId: string,
  deps: { orderRepo: OrderRepository },
): Promise<AdminOrderDetail> {
  const order = await deps.orderRepo.get(orderId);
  if (!order) {
    throw new AppError("NOT_FOUND", "Pesanan tidak ditemukan.");
  }

  const packagesConfig = await configRepository.getPackages();
  const pkg = packagesConfig?.packages.find((p) => p.id === order.package_id);

  return {
    id: order.id,
    order_ref: order.order_ref,
    number: order.number,
    full_name: order.full_name,
    university: order.university,
    whatsapp: order.whatsapp,
    email: order.email,
    package_id: order.package_id,
    package_label: pkg?.label ?? order.package_id,
    price_at_order: order.price_at_order,
    status: order.status,
    submitted_at: order.submitted_at.toISOString(),
    verified_at: order.verified_at ? order.verified_at.toISOString() : null,
    verified_by: order.verified_by,
    admin_note: order.admin_note,
  };
}

export function createAdminGetOrderDeps() {
  return { orderRepo: new OrderRepository() };
}
