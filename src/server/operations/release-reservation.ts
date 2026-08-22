import { AppError } from "@/lib/errors";
import { NumberRepository } from "@/server/repositories/number-repository";
import { SessionRepository } from "@/server/session/session-repository";

export interface ReleaseReservationDeps {
  numberRepo: NumberRepository;
  sessionRepo: SessionRepository;
}

export function createReleaseReservationDeps(): ReleaseReservationDeps {
  return { numberRepo: new NumberRepository(), sessionRepo: new SessionRepository() };
}

/**
 * `releaseReservation` (B065, API_SPEC.md). Voluntary early release —
 * used when a student explicitly goes back to pick a different number.
 * Idempotent by design: a session with nothing to release (never
 * reserved, or already released/expired/taken over) gets a silent
 * `{ released: false }`, never an error — only a genuine ownership
 * conflict (this session's own recorded reservation has been taken over)
 * or an in-flight order (`status === 'pending'`, the admin-rejection path
 * owns that transition, not this one) surface as errors.
 */
export async function releaseReservation(
  sessionId: string,
  deps: ReleaseReservationDeps,
): Promise<{ released: boolean; number: string | null }> {
  return deps.numberRepo.runTransaction(async (tx) => {
    const sessionRow = await deps.sessionRepo.getForUpdate(sessionId, tx);
    const current = sessionRow?.current_reservation ?? null;
    if (current === null) {
      return { released: false, number: null };
    }

    const numberRow = await deps.numberRepo.getForUpdate(current.number, tx);
    if (numberRow === null) {
      await deps.sessionRepo.setCurrentReservation(sessionId, null, tx);
      return { released: false, number: null };
    }

    if (numberRow.reservation_id !== current.reservation_id) {
      // Taken over, or force-released and re-reserved by someone else —
      // this session no longer owns what it thinks it does. Clear the
      // stale pointer so it stops tripping A5, but surface the mismatch:
      // silently succeeding here would tell the student "released" for a
      // reservation that wasn't theirs to release in the first place.
      await deps.sessionRepo.setCurrentReservation(sessionId, null, tx);
      throw new AppError("SESSION_MISMATCH", "Reservasi ini sudah tidak lagi milik sesi Anda.");
    }

    if (numberRow.status === "pending") {
      throw new AppError(
        "CONFLICT",
        "Nomor sudah dalam proses verifikasi dan tidak dapat dilepas. Hubungi admin jika ingin membatalkan.",
      );
    }

    if (numberRow.status !== "reserved") {
      // Already sold/available/etc by some other path — nothing left to
      // release, but the session's pointer was stale regardless.
      await deps.sessionRepo.setCurrentReservation(sessionId, null, tx);
      return { released: false, number: null };
    }

    await deps.numberRepo.updateFields(
      current.number,
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
    await deps.sessionRepo.setCurrentReservation(sessionId, null, tx);
    return { released: true, number: current.number };
  });
}
