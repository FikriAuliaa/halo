import { formatPhoneDisplay } from "@/domain/phone";
import { shuffle } from "@/lib/array";
import type { GetAvailableNumbersQuery } from "@/schemas/number";
import { NumberRepository } from "@/server/repositories/number-repository";

/**
 * The public projection of a number — deliberately narrow. Never
 * `session_id`, `reserved_until`, or `sold_at`: those are internal state a
 * student has no legitimate reason to see, enforced here at the operation
 * boundary rather than by convention (B057).
 */
export interface AvailableNumberProjection {
  id: string;
  number: string;
  display: string;
}

export interface GetAvailableNumbersResult {
  numbers: AvailableNumberProjection[];
}

/**
 * `getAvailableNumbers` (API_SPEC.md). Draws from the lazily-evaluated
 * pool — a `reserved` number whose TTL has already lapsed is available
 * here regardless of whether the scheduled janitor has cleaned it up yet
 * (ADR-004) — then applies suffix search and exclusion before taking a
 * fresh random sample, so repeated "Refresh" calls don't keep surfacing
 * the same subset (C14).
 */
export async function getAvailableNumbers(
  input: GetAvailableNumbersQuery,
  deps: { repo: NumberRepository },
): Promise<GetAvailableNumbersResult> {
  const pool = await deps.repo.listEffectivelyAvailablePool();

  let candidates = pool;
  if (input.suffix) {
    candidates = candidates.filter((doc) => doc.number.endsWith(input.suffix!));
  }
  if (input.exclude && input.exclude.length > 0) {
    const excluded = new Set(input.exclude);
    candidates = candidates.filter((doc) => !excluded.has(doc.number));
  }

  const sample = shuffle(candidates).slice(0, input.limit);

  return {
    numbers: sample.map((doc) => ({
      id: doc.number,
      number: doc.number,
      display: formatPhoneDisplay(doc.number),
    })),
  };
}

export function createGetAvailableNumbersDeps() {
  return { repo: new NumberRepository() };
}
