# ADR-007: Offline Sales Status

**Status:** Accepted
**Date:** 2026-08-20
**Owning blocks:** B022, Phase 12 (B098–B103)

## Context

Spec §6.5 lets an admin "manually update a number's status (e.g. mark as SOLD_OFFLINE if sold via direct sales)"; spec §5 scopes visibility of offline sales specifically to `Admin Telkomsel`. Spec §12 item 6 describes the operational trigger: a daily recap report from Telkomsel field sales.

## Decision

`sold_offline` is a first-class, terminal status (ADR-003), distinct from `sold` (which always implies the online flow completed). Only `available` numbers may transition to `sold_offline` — a `reserved` or `pending` number cannot be marked offline-sold directly; the operation fails with `CONFLICT` instead of silently overriding a live student session (`PRD.md` edge case, `SECURITY.md` threat table). Only `ADMIN_TELKOMSEL` may call `adminMarkSoldOffline` (`API_SPEC.md`), matching spec §5's visibility split. Marking is **not reversible** through the standard operation — reversing a mistaken offline-mark requires the same manual `adminUpdateNumber` correction path used for any other data-entry fix (ADR-003), which is available to either admin role but is explicitly a correction tool, not a workflow step, and its use is expected to be rare and worth being slightly inconvenient.

**Daily recap reconciliation:** handled as manual/bulk-paste marking (`RUNBOOK.md` procedure 10, OQ-7 default) rather than an automated file-import pipeline — no recap file format is specified by the business, and building an importer against an undefined format would be speculative.

## Alternatives considered

- **Treat offline sales as `sold` with a `channel` field, no separate status.** Rejected — `DATA_MODEL.md` does add a `sold_channel` field for finer-grained reporting, but keeping the _status itself_ distinct lets the admin dashboard filter "sold offline" with a direct index-backed query (`DATA_MODEL.md`'s `status ASC, updated_at DESC` index) instead of a compound filter, and matches the spec's own vocabulary directly.
- **Allow marking a `reserved` number offline-sold, force-releasing the reservation.** Rejected — this would silently evict a student mid-flow with no notification, the worse of the two failure modes weighed in `PRD.md`'s edge case discussion; requiring the admin to wait (or manually contact the student) is a better default than automated eviction.
- **Make offline-marking reversible via a dedicated "unmark" operation.** Rejected as unnecessary scope — the generic correction path already covers this rare case without adding a new operation and a new set of tests solely for it.
- **Build an automated recap-file importer now.** Rejected (OQ-7) — no file format is specified; building against an unspecified format would be guesswork, and manual/bulk-paste marking already covers the described volume.

## Consequences

An `ADMIN_KAMPUS` user cannot mark offline sales — if the business later wants to relax this, it's a one-line role-check change in `API_SPEC.md`'s `adminMarkSoldOffline` entry, not a schema change. A recap-file importer remains addable later without any data model change, since it would simply call the same bulk `adminMarkSoldOffline` operation programmatically.

## Verification

E2E scenario J (mark sold offline → number disappears from the student-facing list) and scenario L (an `ADMIN_KAMPUS` attempt at this specific operation gets `FORBIDDEN`). Integration test: attempting to mark a `reserved` number offline-sold returns `CONFLICT` and leaves both the reservation and the number's status untouched.
