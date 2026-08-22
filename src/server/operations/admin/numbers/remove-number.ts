import { AppError } from "@/lib/errors";
import { writeAuditLog } from "@/server/framework/audit-log";
import type { AdminContext } from "@/server/framework/handler";
import { NumberRepository } from "@/server/repositories/number-repository";

export interface AdminRemoveNumberInput {
  number: string;
}

/**
 * `adminRemoveNumber` (B058, API_SPEC.md §"allowed only if `available`").
 * Refuses `reserved`/`pending`/`sold`/`sold_offline` with a specific
 * reason rather than a generic conflict, so the admin UI can explain why.
 */
export async function adminRemoveNumber(
  input: AdminRemoveNumberInput,
  actor: AdminContext,
  deps: { repo: NumberRepository },
): Promise<{ number: string }> {
  await deps.repo.runTransaction(async (tx) => {
    const doc = await deps.repo.getForUpdate(input.number, tx);
    if (!doc) {
      throw new AppError("NOT_FOUND", "Nomor tidak ditemukan.");
    }
    if (doc.status !== "available") {
      throw new AppError(
        "CONFLICT",
        `Nomor berstatus ${doc.status} tidak dapat dihapus. Hanya nomor tersedia yang dapat dihapus.`,
      );
    }

    await deps.repo.delete(input.number, tx);
    await writeAuditLog(tx, {
      actor_uid: actor.uid,
      actor_role: actor.role,
      action: "adminRemoveNumber",
      entity_type: "number",
      entity_id: input.number,
      before: doc,
      after: null,
      reason: null,
    });
  });

  return { number: input.number };
}

export function createAdminRemoveNumberDeps() {
  return { repo: new NumberRepository() };
}
