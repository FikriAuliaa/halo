import { randomUUID } from "node:crypto";
import type postgres from "postgres";
import { AppError } from "@/lib/errors";
import { withIdempotency } from "@/server/framework/idempotency";
import type { Logger } from "@/server/framework/logger";
import { configRepository } from "@/server/repositories/config-repository";
import { NumberRepository } from "@/server/repositories/number-repository";
import { OrderRepository } from "@/server/repositories/order-repository";
import { requireSession } from "@/server/session/session";
import { uploadProof } from "@/server/storage/upload-proof";
import type { OrderFormInput } from "@/schemas/order";

export interface SubmitOrderCommand {
  sessionId: string;
  idempotencyKey: string;
  form: OrderFormInput;
  proofFile: File;
}

export interface SubmitOrderDeps {
  numberRepo: NumberRepository;
  orderRepo: OrderRepository;
  logger: Logger;
}

export function createSubmitOrderDeps(logger: Logger): SubmitOrderDeps {
  return { numberRepo: new NumberRepository(), orderRepo: new OrderRepository(), logger };
}

/**
 * `submitOrder` (B085). Re-validates everything server-side regardless of
 * what the client claims: the reservation itself (rejecting an
 * `RESERVATION_EXPIRED` reservation that lapsed while the form was open),
 * the package (must still be active), and the university (must still be
 * on the allowlist) — a client-supplied price, status, timestamp, or
 * order reference is never accepted; `order_ref`/`tracking_token_hash`
 * are the ones minted at reservation time (B062), only ever copied here.
 *
 * The proof upload happens *before* the transaction — Storage has no
 * transactional join with Postgres, so a transaction failure after a
 * successful upload can orphan an object. That orphan is logged
 * (`orphaned_proof`) for manual cleanup rather than silently lost; a
 * dedicated orphan-sweep job is out of scope here.
 */
export interface SubmitOrderResult {
  order_ref: string;
  number: string;
  package_label: string;
  full_name: string;
  email: string;
  submitted_at: string;
}

export async function submitOrder(
  command: SubmitOrderCommand,
  deps: SubmitOrderDeps,
): Promise<SubmitOrderResult> {
  const session = await requireSession(command.sessionId);
  const current = session?.current_reservation ?? null;
  if (current === null) {
    throw new AppError("RESERVATION_NOT_FOUND", "Tidak ada reservasi aktif untuk sesi ini.");
  }

  const numberRow = await deps.numberRepo.get(current.number);
  if (
    numberRow === null ||
    numberRow.reservation_id !== current.reservation_id ||
    numberRow.status !== "reserved" ||
    (numberRow.reserved_until !== null && numberRow.reserved_until.getTime() <= Date.now())
  ) {
    throw new AppError("RESERVATION_EXPIRED", "Reservasi Anda telah berakhir.");
  }

  const packagesConfig = await configRepository.getPackages();
  const pkg = packagesConfig?.packages.find((p) => p.id === command.form.package_id && p.active);
  if (!pkg) {
    throw new AppError("VALIDATION_FAILED", "Paket tidak tersedia.", "package_id");
  }

  const universitiesConfig = await configRepository.getUniversities();
  const allowedUniversities = new Set(
    (universitiesConfig?.list ?? []).filter((u) => u.active).map((u) => u.name),
  );
  if (!allowedUniversities.has(command.form.university)) {
    throw new AppError("VALIDATION_FAILED", "Universitas tidak terdaftar.", "university");
  }

  const orderId = randomUUID();
  const { path: proofPath } = await uploadProof(command.proofFile, orderId);

  try {
    return await withIdempotency(command.idempotencyKey, "submitOrder", (tx) =>
      submitOrderInTransaction(tx, {
        orderId,
        number: current.number,
        sessionId: command.sessionId,
        form: command.form,
        proofPath,
        orderRef: numberRow.order_ref!,
        trackingTokenHash: numberRow.tracking_token_hash!,
        price: pkg.price,
        packageLabel: pkg.label,
        deps,
      }),
    );
  } catch (error) {
    deps.logger.error("orphaned_proof", {
      path: proofPath,
      order_id: orderId,
      reason: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function submitOrderInTransaction(
  tx: postgres.TransactionSql,
  params: {
    orderId: string;
    number: string;
    sessionId: string;
    form: OrderFormInput;
    proofPath: string;
    orderRef: string;
    trackingTokenHash: string;
    price: number;
    packageLabel: string;
    deps: SubmitOrderDeps;
  },
): Promise<SubmitOrderResult> {
  const {
    orderId,
    number,
    sessionId,
    form,
    proofPath,
    orderRef,
    trackingTokenHash,
    price,
    packageLabel,
    deps,
  } = params;

  // Re-checked inside the transaction: state may have changed since the
  // pre-upload validation above (B085's own explicit requirement).
  const numberRow = await deps.numberRepo.getForUpdate(number, tx);
  if (
    numberRow === null ||
    numberRow.status !== "reserved" ||
    numberRow.session_id !== sessionId ||
    (numberRow.reserved_until !== null && numberRow.reserved_until.getTime() <= Date.now())
  ) {
    throw new AppError("RESERVATION_EXPIRED", "Reservasi Anda telah berakhir.");
  }

  const submittedAt = new Date();
  await deps.orderRepo.create(
    {
      id: orderId,
      number,
      order_ref: orderRef,
      tracking_token_hash: trackingTokenHash,
      session_id: sessionId,
      full_name: form.full_name,
      university: form.university,
      whatsapp: form.whatsapp,
      email: form.email,
      package_id: form.package_id,
      payment_proof_path: proofPath,
      status: "pending",
      submitted_at: submittedAt,
      verified_at: null,
      verified_by: null,
      admin_note: null,
      price_at_order: price,
    },
    tx,
  );

  // Reservation fields are cleared (no longer at risk of TTL expiry) but
  // the session link and the reservation/order identity stay in place —
  // `validateReservation` and the confirmation/tracking screens still
  // need them (ADR-003's reserved -> pending transition, B085).
  await deps.numberRepo.updateFields(
    number,
    { status: "pending", reserved_at: null, reserved_until: null },
    tx,
  );

  return {
    order_ref: orderRef,
    number,
    package_label: packageLabel,
    full_name: form.full_name,
    email: form.email,
    submitted_at: submittedAt.toISOString(),
  };
}
