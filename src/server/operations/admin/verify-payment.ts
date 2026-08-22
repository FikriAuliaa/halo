import type postgres from "postgres";
import { AppError } from "@/lib/errors";
import { withIdempotency } from "@/server/framework/idempotency";
import { writeAuditLog } from "@/server/framework/audit-log";
import type { AdminContext } from "@/server/framework/handler";
import { NumberRepository } from "@/server/repositories/number-repository";
import { OrderRepository } from "@/server/repositories/order-repository";

export interface AdminVerifyPaymentDeps {
  orderRepo: OrderRepository;
  numberRepo: NumberRepository;
}

export function createAdminVerifyPaymentDeps(): AdminVerifyPaymentDeps {
  return { orderRepo: new OrderRepository(), numberRepo: new NumberRepository() };
}

/**
 * `adminVerifyPayment` (B104) — order → `verified`, number → `sold`,
 * atomically. Re-verifies the order is still `pending` **inside** the
 * transaction: two admins opening the same order is an ordinary Tuesday,
 * and the second is told plainly it was already handled rather than
 * silently overwriting the first admin's decision. Not reversible through
 * this path by design (RUNBOOK.md's manual-correction procedure exists
 * for that, deliberately a different, `ADMIN_TELKOMSEL`-only code path).
 */
export async function adminVerifyPayment(
  orderId: string,
  adminNote: string | undefined,
  actor: AdminContext,
  idempotencyKey: string,
  deps: AdminVerifyPaymentDeps,
): Promise<{ order_ref: string; status: "verified" }> {
  return withIdempotency(idempotencyKey, "adminVerifyPayment", (tx) =>
    verifyInTransaction(tx, orderId, adminNote, actor, deps),
  );
}

async function verifyInTransaction(
  tx: postgres.TransactionSql,
  orderId: string,
  adminNote: string | undefined,
  actor: AdminContext,
  deps: AdminVerifyPaymentDeps,
): Promise<{ order_ref: string; status: "verified" }> {
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
    {
      status: "verified",
      verified_at: now,
      verified_by: actor.uid,
      ...(adminNote !== undefined ? { admin_note: adminNote } : {}),
    },
    tx,
  );
  await deps.numberRepo.updateFields(
    order.number,
    { status: "sold", sold_at: now, sold_channel: "online" },
    tx,
  );

  await writeAuditLog(tx, {
    actor_uid: actor.uid,
    actor_role: actor.role,
    action: "adminVerifyPayment",
    entity_type: "order",
    entity_id: orderId,
    before: { status: order.status },
    after: { status: "verified", verified_by: actor.uid },
    reason: adminNote ?? null,
  });

  return { order_ref: order.order_ref, status: "verified" };
}
