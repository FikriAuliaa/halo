import { normalizePhone } from "@/domain/phone";
import type { NumberRow } from "@/server/db/types";
import type { AdminAddNumbersInput } from "@/schemas/number";
import { writeAuditLog } from "@/server/framework/audit-log";
import type { AdminContext } from "@/server/framework/handler";
import { NumberRepository } from "@/server/repositories/number-repository";

export type AdminAddNumberOutcome =
  | { input: string; number: string; outcome: "created" }
  | { input: string; number: string; outcome: "already_present" }
  | { input: string; number: string; outcome: "duplicate_in_batch" }
  | { input: string; outcome: "invalid"; reason: string };

export interface AdminAddNumbersResult {
  results: AdminAddNumberOutcome[];
  created: number;
}

function freshNumberRow(number: string): NumberRow {
  return {
    number,
    status: "available",
    reserved_at: null,
    reserved_until: null,
    session_id: null,
    reservation_id: null,
    order_ref: null,
    tracking_token_hash: null,
    sold_at: null,
    sold_channel: null,
    updated_at: new Date(),
  };
}

/**
 * `adminAddNumbers` (B058, API_SPEC.md). Format validation happens here,
 * per entry, rather than in the request schema — a malformed digit string
 * becomes one itemised `"invalid"` result, not a whole-batch
 * `VALIDATION_FAILED`. Each entry runs in its own transaction (mirrors
 * `scripts/seed-numbers.ts`'s sequential-loop precedent) so a duplicate or
 * invalid entry elsewhere in the batch never blocks the rest.
 */
export async function adminAddNumbers(
  input: AdminAddNumbersInput,
  actor: AdminContext,
  deps: { repo: NumberRepository },
): Promise<AdminAddNumbersResult> {
  const results: AdminAddNumberOutcome[] = [];
  const seenInBatch = new Set<string>();

  for (const raw of input.numbers) {
    const normalized = normalizePhone(raw);
    if (!normalized.ok || normalized.value === null) {
      results.push({
        input: raw,
        outcome: "invalid",
        reason: normalized.reason ?? "Nomor tidak valid.",
      });
      continue;
    }

    const number = normalized.value;
    if (seenInBatch.has(number)) {
      results.push({ input: raw, number, outcome: "duplicate_in_batch" });
      continue;
    }
    seenInBatch.add(number);

    const created = await deps.repo.runTransaction(async (tx) => {
      const existing = await deps.repo.getForUpdate(number, tx);
      if (existing) return false;

      const row = freshNumberRow(number);
      await tx`insert into numbers ${tx(row)}`;
      await writeAuditLog(tx, {
        actor_uid: actor.uid,
        actor_role: actor.role,
        action: "adminAddNumbers",
        entity_type: "number",
        entity_id: number,
        before: null,
        after: row,
        reason: null,
      });
      return true;
    });

    results.push({ input: raw, number, outcome: created ? "created" : "already_present" });
  }

  return { results, created: results.filter((r) => r.outcome === "created").length };
}

export function createAdminAddNumbersDeps() {
  return { repo: new NumberRepository() };
}
