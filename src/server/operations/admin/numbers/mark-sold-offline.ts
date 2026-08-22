import { canTransition, getEffectiveStatus } from "@/domain/number-status";
import type { AdminMarkSoldOfflineInput } from "@/schemas/admin";
import { writeAuditLog } from "@/server/framework/audit-log";
import type { AdminContext } from "@/server/framework/handler";
import { NumberRepository } from "@/server/repositories/number-repository";

export type AdminMarkSoldOfflineOutcome =
  | { number: string; outcome: "sold_offline" }
  | { number: string; outcome: "not_found" }
  | { number: string; outcome: "conflict"; message: string };

export interface AdminMarkSoldOfflineResult {
  results: AdminMarkSoldOfflineOutcome[];
}

/**
 * `adminMarkSoldOffline` (B058, RUNBOOK.md §10, OPERATIONS.md's recap
 * procedure). Bulk, per-entry outcomes — a conflict on one number never
 * fails the batch. Uses `getEffectiveStatus` before checking the
 * transition (ADR-004): a `reserved` number whose TTL has already lapsed
 * is exactly as available here as it is in the student catalog.
 */
export async function adminMarkSoldOffline(
  input: AdminMarkSoldOfflineInput,
  actor: AdminContext,
  deps: { repo: NumberRepository },
): Promise<AdminMarkSoldOfflineResult> {
  const results: AdminMarkSoldOfflineOutcome[] = [];

  for (const number of input.numbers) {
    const outcome = await deps.repo.runTransaction(async (tx) => {
      const doc = await deps.repo.getForUpdate(number, tx);
      if (!doc) {
        return { number, outcome: "not_found" as const };
      }

      const now = new Date();
      const effectiveStatus = getEffectiveStatus(doc, now);
      if (!canTransition(effectiveStatus, "sold_offline", actor.role)) {
        return {
          number,
          outcome: "conflict" as const,
          message: `Nomor berstatus ${effectiveStatus} tidak dapat ditandai terjual offline.`,
        };
      }

      const after = {
        status: "sold_offline" as const,
        sold_at: now,
        sold_channel: "offline" as const,
        reserved_at: null,
        reserved_until: null,
        session_id: null,
        reservation_id: null,
        order_ref: null,
        tracking_token_hash: null,
      };
      await deps.repo.updateFields(number, after, tx);
      await writeAuditLog(tx, {
        actor_uid: actor.uid,
        actor_role: actor.role,
        action: "adminMarkSoldOffline",
        entity_type: "number",
        entity_id: number,
        before: doc,
        after: { ...doc, ...after },
        reason: null,
      });
      return { number, outcome: "sold_offline" as const };
    });

    results.push(outcome);
  }

  return { results };
}

export function createAdminMarkSoldOfflineDeps() {
  return { repo: new NumberRepository() };
}
