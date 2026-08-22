import { AppError } from "@/lib/errors";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { withTransaction } from "@/server/db/client";
import { writeAuditLog } from "@/server/framework/audit-log";
import type { AdminContext } from "@/server/framework/handler";
import type { Logger } from "@/server/framework/logger";
import { OrderRepository } from "@/server/repositories/order-repository";

const SIGNED_URL_TTL_SECONDS = 5 * 60;
const BUCKET = "proofs";

/**
 * `adminGetProofUrl` (B103) — mints a **fresh** 5-minute signed URL per
 * call; never stored or cached (client-side or server-side) beyond the
 * request that returns it. Payment proofs are financial documents, so
 * every access writes an audit record — the signed URL itself is never
 * logged (only the fact that this admin viewed this order's proof, and
 * when).
 */
export async function adminGetProofUrl(
  orderId: string,
  actor: AdminContext,
  logger: Logger,
  deps: { orderRepo: OrderRepository },
): Promise<{ url: string; expires_in: number }> {
  const order = await deps.orderRepo.get(orderId);
  if (!order) {
    throw new AppError("NOT_FOUND", "Pesanan tidak ditemukan.");
  }

  // `payment_proof_path` is stored as `"<bucket>/<object key>"` (B083) —
  // split it back apart for the Storage API call.
  const [, ...keyParts] = order.payment_proof_path.split("/");
  const objectKey = keyParts.join("/");

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(objectKey, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    // The safe AppError below never reaches `toHttpResponse`'s generic
    // `unhandled_exception` logging (this error is already an AppError
    // by the time it gets there) — so the real cause is logged here, or
    // it's lost entirely.
    logger.error("proof_signed_url_failed", {
      order_id: orderId,
      object_key: objectKey,
      message: error?.message ?? "no data returned",
    });
    throw new AppError("INTERNAL", "Gagal membuat tautan bukti pembayaran.");
  }

  await withTransaction(async (tx) => {
    await writeAuditLog(tx, {
      actor_uid: actor.uid,
      actor_role: actor.role,
      action: "adminGetProofUrl",
      entity_type: "order",
      entity_id: orderId,
      before: null,
      after: null,
      reason: null,
    });
  });

  return { url: data.signedUrl, expires_in: SIGNED_URL_TTL_SECONDS };
}

export function createAdminGetProofUrlDeps() {
  return { orderRepo: new OrderRepository() };
}
