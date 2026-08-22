import { AppError } from "@/lib/errors";
import { writeAuditLog } from "@/server/framework/audit-log";
import type { AdminContext } from "@/server/framework/handler";
import { NumberRepository } from "@/server/repositories/number-repository";
import { SessionRepository } from "@/server/session/session-repository";

export interface AdminForceReleaseCommand {
  number: string;
  reason: string;
}

/**
 * `adminForceReleaseReservation` (B068) — releases a **live** reservation.
 * Genuinely destructive to a student mid-order, so it's restricted to
 * `ADMIN_TELKOMSEL` (enforced at the route) and requires a written reason,
 * fully audited.
 */
export async function adminForceReleaseReservation(
  input: AdminForceReleaseCommand,
  actor: AdminContext,
  deps: { numberRepo: NumberRepository; sessionRepo: SessionRepository },
): Promise<{ number: string; released: boolean; released_session_id: string | null }> {
  return deps.numberRepo.runTransaction(async (tx) => {
    const doc = await deps.numberRepo.getForUpdate(input.number, tx);
    if (!doc) {
      throw new AppError("NOT_FOUND", "Nomor tidak ditemukan.");
    }
    if (doc.status !== "reserved") {
      throw new AppError(
        "CONFLICT",
        `Nomor berstatus ${doc.status}, bukan reservasi aktif yang dapat dilepas paksa.`,
      );
    }

    await deps.numberRepo.updateFields(
      input.number,
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

    if (doc.session_id) {
      await deps.sessionRepo.setCurrentReservation(doc.session_id, null, tx);
    }

    await writeAuditLog(tx, {
      actor_uid: actor.uid,
      actor_role: actor.role,
      action: "adminForceReleaseReservation",
      entity_type: "number",
      entity_id: input.number,
      before: doc,
      after: null,
      reason: input.reason,
    });

    return { number: input.number, released: true, released_session_id: doc.session_id };
  });
}

export function createAdminForceReleaseDeps() {
  return { numberRepo: new NumberRepository(), sessionRepo: new SessionRepository() };
}
