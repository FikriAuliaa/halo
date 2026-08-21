# ADR-008: Seed Data Reconciliation

**Status:** Accepted
**Date:** 2026-08-20
**Owning blocks:** B023, Phase 5 (B052–B054)

## Context

The planning premise that the visible 96-number source list "still contains entries identified elsewhere as duplicates" was tested directly (`docs/reports/seed-reconciliation.md`, B006) using two independent parsing methods and found false — the dataset is clean: 96 extracted, 96 distinct, 0 duplicates, 0 invalid entries. A reconciliation step remains valuable regardless, as a standing, re-runnable check against future changes to the source list.

## Decision

**Normalisation:** none required at the character level for the existing dataset (already `08`-prefixed, 12 digits, digit-only); the importer nonetheless strips whitespace and non-digit characters defensively, since this rule must hold for any future source list, not just the current one.
**Validation:** starts with `08`, 10–13 digits total, digits-only after normalisation — directly from spec §8.1.
**Deduplication policy:** exact-match on the normalised value; a duplicate found in a future source list is rejected (not silently kept, not silently dropped without a report) and itemised in the reconciliation report with its position(s).
**Idempotent re-run:** running the importer twice against the same source and the same target Firestore project is a no-op the second time — existing `numbers` documents (keyed by the number itself, ADR/`DATA_MODEL.md`) are left untouched, and only genuinely new numbers are added.
**Mandatory reporting:** every run — dev, staging, prod — produces a report in the same shape as `docs/reports/seed-reconciliation.md` (extracted / distinct / duplicate / invalid / accepted counts, plus the status of any specifically-named numbers).

**The dataset is clean — stated as a finding, not assumed.** `Extracted 96 / Distinct 96 / Duplicate 0 / Invalid 0 / Accepted 96`, verified twice independently (B006).

**Standing rule:** any future run against a modified source list that does **not** report exactly `96/96/0/0/96` — or, for a deliberately changed source list, whatever the new expected accepted count is, explicitly updated in this ADR — has detected a real deviation and must fail the import loudly (non-zero exit code, no partial write) rather than silently accepting a different count.

## Alternatives considered

- **Trust the planning document's premise and build a "repair" step for contaminated data.** Rejected — this would have been repairing a defect that direct verification showed does not exist; building repair logic for a non-problem would be exactly the kind of premature complexity `AGENTS.md` warns against.
- **Skip reconciliation entirely since the data is confirmed clean.** Rejected — a deterministic, re-runnable, self-reporting importer has standing value independent of today's finding: it protects against a _future_ source-list edit introducing real duplicates or malformed entries, silently.
- **Silently drop invalid/duplicate entries with only a log line.** Rejected — master prompt §29 requires every rejected record to have an individually-stated reason in a committed report, not a log line that rotates away.

## Consequences

If the business ever supplies a genuinely updated number list, the importer will only accept it after an explicit, reviewed update to the expected-count assertion in this ADR — a deliberate friction point, not an oversight.

## Verification

`docs/reports/seed-reconciliation.md` is the artefact this ADR formalises. The B056 importer (`scripts/seed-numbers.ts`) implements the standing rule stated above, and its own test suite re-runs the reconciliation logic against both a small fixture (proving duplicate/invalid/re-run/sold-preservation behaviour individually) and the real `data/seed/numbers.source.txt`, asserting the accepted count matches this ADR's stated expectation on every test run. A real run against the emulator confirms the same result operationally: `docs/reports/seed-run-2026-08-21T06-10-36-283Z.md` reports `source=96 accepted=96 rejected=0 duplicates=0 written=96`.
