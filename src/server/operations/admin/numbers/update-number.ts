import { AppError } from "@/lib/errors";
import { writeAuditLog } from "@/server/framework/audit-log";
import type { AdminContext } from "@/server/framework/handler";
import { NumberRepository } from "@/server/repositories/number-repository";

export interface AdminUpdateNumberCommand {
  /** The existing number being corrected (from the URL). */
  number: string;
  /** The corrected value, if this call renames the number; omitted for a
   * reason-only annotation with no field change. */
  correctedNumber?: string;
  reason: string;
}

/**
 * `adminUpdateNumber` (B058). See `adminUpdateNumberSchema`'s doc comment
 * in `src/schemas/number.ts` for why this is a rename, not a status
 * override: the phone number is the primary key, so "correcting a typo'd
 * digit" is a delete-and-recreate under the corrected ID, permitted only
 * while the original has never been reserved. `status` never changes.
 * Omitting `correctedNumber` records `reason` as an audited annotation
 * against the number's current state, with no field change at all.
 */
export async function adminUpdateNumber(
  input: AdminUpdateNumberCommand,
  actor: AdminContext,
  deps: { repo: NumberRepository },
): Promise<{ number: string }> {
  const { number, correctedNumber, reason } = input;

  if (correctedNumber !== undefined && correctedNumber === number) {
    throw new AppError(
      "VALIDATION_FAILED",
      "Nomor koreksi harus berbeda dari nomor asal.",
      "number",
    );
  }

  await deps.repo.runTransaction(async (tx) => {
    const original = await deps.repo.getForUpdate(number, tx);
    if (!original) {
      throw new AppError("NOT_FOUND", "Nomor tidak ditemukan.");
    }

    if (correctedNumber === undefined) {
      await writeAuditLog(tx, {
        actor_uid: actor.uid,
        actor_role: actor.role,
        action: "adminUpdateNumber",
        entity_type: "number",
        entity_id: number,
        before: original,
        after: original,
        reason,
      });
      return;
    }

    if (original.status !== "available" || original.reserved_at !== null) {
      throw new AppError(
        "CONFLICT",
        "Nomor hanya dapat dikoreksi selama masih tersedia dan belum pernah dipesan.",
      );
    }

    const target = await deps.repo.getForUpdate(correctedNumber, tx);
    if (target) {
      throw new AppError("CONFLICT", "Nomor tujuan sudah terdaftar.", "number");
    }

    const after = { ...original, number: correctedNumber, updated_at: new Date() };
    await tx`delete from numbers where number = ${number}`;
    await tx`insert into numbers ${tx(after)}`;
    await writeAuditLog(tx, {
      actor_uid: actor.uid,
      actor_role: actor.role,
      action: "adminUpdateNumber",
      entity_type: "number",
      entity_id: number,
      before: original,
      after,
      reason,
    });
  });

  return { number: correctedNumber ?? number };
}

export function createAdminUpdateNumberDeps() {
  return { repo: new NumberRepository() };
}
