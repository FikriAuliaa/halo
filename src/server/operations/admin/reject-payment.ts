import type postgres from "postgres";
import { AppError } from "@/lib/errors";
import { withIdempotency } from "@/server/framework/idempotency";
import { writeAuditLog } from "@/server/framework/audit-log";
import type { AdminContext } from "@/server/framework/handler";
import { NumberRepository } from "@/server/repositories/number-repository";
import { OrderRepository } from "@/server/repositories/order-repository";

export interface AdminRejectPaymentDeps {
  orderRepo: OrderRepository;
  numberRepo: NumberRepository;
}

export function createAdminRejectPaymentDeps(): AdminRejectPaymentDeps {
  return { orderRepo: new OrderRepository(), numberRepo: new NumberRepository() };
}

/**
 * `adminRejectPayment` (B104) — order → `rejected`, number → `available`
 * with every reservation-identity field cleared (the number is genuinely
 * free for anyone; the permanent record of what happened lives in
 * `audit_log`, not in stale fields on the number itself). Same re-check-
 * inside-the-transaction guard as `adminVerifyPayment` — a second admin
 * acting on an already-handled order is told plainly, never silently
 * overridden.
 */
export async function adminRejectPayment(
  orderId: string,
  adminNote: string,
  actor: AdminContext,
  idempotencyKey: string,
  deps: AdminRejectPaymentDeps,
): Promise<{ order_ref: string; status: "rejected" }> {
  return withIdempotency(idempotencyKey, "adminRejectPayment", (tx) =>
    rejectInTransaction(tx, orderId, adminNote, actor, deps),
  );
}

async function rejectInTransaction(
  tx: postgres.TransactionSql,
  orderId: string,
  adminNote: string,
  actor: AdminContext,
  deps: AdminRejectPaymentDeps,
): Promise<{ order_ref: string; status: "rejected" }> {
  const order = await deps.orderRepo.getForUpdate(orderId, tx);
  if (!order) {
    throw new AppError("NOT_FOUND", "Pesanan tidak ditemukan.");
  }
  if (order.status !== "pending") {
    throw new AppError(
      "CONFLICT",
      `Pesanan ini sudah diproses sebelumnya (status saat ini: ${order.status}).`,
    );
  }

  const now = new Date();
  await deps.orderRepo.updateFields(
    orderId,
    { status: "rejected", verified_at: now, verified_by: actor.uid, admin_note: adminNote },
    tx,
  );
  await deps.numberRepo.updateFields(
    order.number,
    {
      status: "available",
      reserved_at: null,
      reserved_until: null,
      session_id: null,
      reservation_id: null,
      order_ref: null,
      tracking_token_hash: null,
    },
    tx,
  );

  await writeAuditLog(tx, {
    actor_uid: actor.uid,
    actor_role: actor.role,
    action: "adminRejectPayment",
    entity_type: "order",
    entity_id: orderId,
    before: { status: order.status },
    after: { status: "rejected" },
    reason: adminNote,
  });

  return { order_ref: order.order_ref, status: "rejected" };
}
