import { AppError } from "@/lib/errors";
import { hashTrackingToken } from "@/lib/id";
import { formatPhoneDisplay } from "@/domain/phone";
import { configRepository } from "@/server/repositories/config-repository";
import { OrderRepository } from "@/server/repositories/order-repository";

export interface GetTrackingStatusInput {
  order_ref: string;
  tracking_token: string;
}

export interface GetTrackingStatusResult {
  status: string;
  number: string;
  package_label: string;
  submitted_at: string;
  verified_at: string | null;
  admin_note?: string;
}

export interface GetTrackingStatusDeps {
  orderRepo: OrderRepository;
}

export function createGetTrackingStatusDeps(): GetTrackingStatusDeps {
  return { orderRepo: new OrderRepository() };
}

/**
 * `getTrackingStatus` (API_SPEC.md) — ADR-005's lookup contract: an exact
 * match on both `order_ref` and the token's hash is required, and "no
 * match" is reported identically (`NOT_FOUND`) regardless of which half
 * was wrong, so a caller can't use the error to narrow down a guess.
 */
export async function getTrackingStatus(
  input: GetTrackingStatusInput,
  deps: GetTrackingStatusDeps,
): Promise<GetTrackingStatusResult> {
  const hash = await hashTrackingToken(input.tracking_token);
  const order = await deps.orderRepo.findByRefAndTokenHash(input.order_ref, hash);
  if (!order) {
    throw new AppError("NOT_FOUND", "Pesanan tidak ditemukan.");
  }

  const packagesConfig = await configRepository.getPackages();
  const pkg = packagesConfig?.packages.find((p) => p.id === order.package_id);

  return {
    status: order.status,
    number: formatPhoneDisplay(order.number),
    package_label: pkg?.label ?? order.package_id,
    submitted_at: order.submitted_at.toISOString(),
    verified_at: order.verified_at ? order.verified_at.toISOString() : null,
    ...(order.status === "rejected" && order.admin_note ? { admin_note: order.admin_note } : {}),
  };
}
