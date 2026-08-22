import { normalizePhone } from "@/domain/phone";
import type { AdminAddNumbersInput } from "@/schemas/number";
import { NumberRepository } from "@/server/repositories/number-repository";

export type AdminPreviewNumberOutcome =
  | { input: string; number: string; outcome: "valid" }
  | { input: string; number: string; outcome: "duplicate_existing" }
  | { input: string; number: string; outcome: "duplicate_in_batch" }
  | { input: string; outcome: "invalid"; reason: string };

export interface AdminPreviewAddNumbersResult {
  results: AdminPreviewNumberOutcome[];
  valid_count: number;
}

/**
 * `adminPreviewAddNumbers` (B107) — a read-only dry run of `adminAddNumbers`
 * so the bulk-add dialog can classify every pasted entry (valid, duplicate
 * of existing inventory, duplicate within the pasted batch, or invalid and
 * why) **before** anything is written. Deliberately mirrors
 * `adminAddNumbers`'s own classification exactly, so what the admin
 * previews is what committing will actually do — this never inserts,
 * never audits, and never locks a row.
 */
export async function adminPreviewAddNumbers(
  input: AdminAddNumbersInput,
  deps: { repo: NumberRepository },
): Promise<AdminPreviewAddNumbersResult> {
  const results: AdminPreviewNumberOutcome[] = [];
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

    const exists = await deps.repo.exists(number);
    results.push({ input: raw, number, outcome: exists ? "duplicate_existing" : "valid" });
  }

  return { results, valid_count: results.filter((r) => r.outcome === "valid").length };
}

export function createAdminPreviewAddNumbersDeps() {
  return { repo: new NumberRepository() };
}
