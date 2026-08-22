import type { AdminListNumbersQuery } from "@/schemas/number";
import type { NumberRow } from "@/server/db/types";
import type { NumberListResult } from "@/server/repositories/number-repository";
import { NumberRepository } from "@/server/repositories/number-repository";

export type AdminNumberView = NumberRow;

/**
 * `adminListNumbers` (B058, rewritten for B106). Full field visibility —
 * this is the trusted tier, not the public projection `getAvailableNumbers`
 * enforces. Offset-paginated with sort (see `NumberRepository.list`'s
 * doc comment); `search` matches a digit substring anywhere in the number.
 */
export async function adminListNumbers(
  input: AdminListNumbersQuery,
  deps: { repo: NumberRepository },
): Promise<NumberListResult> {
  return deps.repo.list(
    { status: input.status, search: input.search },
    { field: input.sort_field, direction: input.sort_direction },
    { page: input.page, limit: input.limit },
  );
}

export function createAdminListNumbersDeps() {
  return { repo: new NumberRepository() };
}
