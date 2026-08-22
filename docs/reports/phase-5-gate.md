# Phase 5 Verification Gate (B060)

## Suites run

| Check                       | Result                                                                                                                                       |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm run lint`             | Clean                                                                                                                                        |
| `pnpm run typecheck`        | Clean                                                                                                                                        |
| `pnpm run test:unit`        | 186/186 (`src/domain`, `src/lib`, `src/schemas`)                                                                                             |
| `pnpm run test:integration` | 109/109 (`src/server`, `scripts` — repositories, operations, admin number management, seed importer)                                         |
| `pnpm run test:rules`       | 46/46 (Firestore + Storage rules)                                                                                                            |
| `pnpm run test:component`   | 138/138                                                                                                                                      |
| `pnpm exec next build`      | Succeeds — `/api/numbers`, `/api/admin/numbers`, `/api/admin/numbers/[id]`, `/api/admin/numbers/sold-offline` all register as dynamic routes |

## Seed reconciliation vs. ADR-008

A fresh emulator (no imported data) was seeded via `firebase emulators:exec ... "pnpm run seed -- --write"`:

```
source=96 accepted=96 rejected=0 duplicates=0 written=96 already_present=0
```

Matches ADR-008's standing expectation exactly (`96/96/0/0/96`). Report: `docs/reports/seed-run-2026-08-21T06-37-04-926Z.md`.

## Public projection leak check

`getAvailableNumbers` is tested against explicit absence, not inspection: `get-available-numbers.test.ts`'s first case asserts `Object.keys(found).sort()` equals exactly `["display", "id", "number"]` and additionally asserts `JSON.stringify(result)` doesn't match `/session_id|reserved_until|sold_at/` anywhere in the full response — including inside nested objects a field-by-field check could miss. No leak.

## Transition matrix vs. ADR-003

`number-status.test.ts` asserts `canTransition` against a table hand-transcribed from ADR-003 for all 5×5 = 25 `(from, to)` pairs, for all four actors (`system`, `student`, `ADMIN_KAMPUS`, `ADMIN_TELKOMSEL`) — 100 assertions, every cell explicit, no implicit default relied upon. Matches exactly.

## Scope covered (B055–B060)

- **B055** — `src/domain/phone.ts`: Halo number normalisation/validation, deliberately distinct from `src/lib/format.ts`'s WhatsApp E.164 normaliser.
- **B056** — `scripts/seed-numbers.ts`: reconciliation-reporting seed importer, idempotent re-run, sold-number preservation.
- **B057** — `getAvailableNumbers` (`src/server/operations/get-available-numbers.ts`, `src/app/api/numbers/route.ts`): lazy-expiry-aware public projection, suffix search, exclusion, randomised sampling, rate-limited.
- **B058** — Admin number management (`src/server/operations/admin/numbers/*.ts`, routes under `src/app/api/admin/numbers/`): list (full field visibility), bulk add (per-entry outcomes), remove (available-only), bulk mark-sold-offline (lazy-expiry-aware, `ADMIN_TELKOMSEL`-only), update (rename-only correction, mandatory reason). Every mutation writes an `audit_log` entry inside the same transaction (new collection, documented in `DATA_MODEL.md`).
- **B059** — `src/domain/number-status.ts`: the exhaustive transition table (built directly after B055, ahead of its listed position, because B058 depends on it — noted at the time, formalised here).
- **B060** — this gate.

## Design decisions made during this phase, not pre-specified

1. **`adminMarkSoldOffline` is bulk-only**, at `POST /api/admin/numbers/sold-offline` with no `{id}` path segment — API_SPEC.md's original single-number sketch contradicted the already-shipped `adminMarkSoldOfflineSchema` (bulk array, max 200) and RUNBOOK.md §10 / OPERATIONS.md's recap procedure (both describe it as a bulk paste tool). API_SPEC.md updated to match the bulk reality; the schema and docs were the authoritative signal here, not the endpoint sketch.
2. **`adminUpdateNumber` never changes `status`.** The block spec's own phrase ("constrained status override") contradicted API_SPEC.md's "may not be used to force a status transition." Resolved in favour of API_SPEC.md's reasoning (one auditable, purpose-built code path per status change) — since the number is the document ID, a correction is implemented as a delete-and-recreate rename, permitted only while the number has never been reserved. The already-shipped schema's optional `number` field (B049) also allows a reason-only annotation call with no field change at all, which the operation honours.
3. **`audit_log/{id}`** is a new collection (documented in `DATA_MODEL.md`), not fields bolted onto `numbers` — B058 requires before/after state per mutation, which a single mutable document can't hold across its own history. Written inside the same transaction as the mutation it describes, mirroring `idempotency_keys`'s existing "written where it can't be decorative" pattern.
4. **`createHandler` now threads Next.js's dynamic route `params`** (`src/server/framework/handler.ts`) — B057 didn't need this (no `{id}` segments), but B058's `/api/admin/numbers/[id]` does. Made the second parameter a required `RouteContext` (Next 15 always supplies it, even `{ params: Promise<{}> }` for static routes) rather than optional, because an optional second parameter on an exported Route Handler fails Next's own generated type validation for non-dynamic routes. `handler.test.ts`'s ~12 direct invocations updated to pass a `noParams` stub accordingly.

## Verdict

All suites pass. Seed counts match ADR-008 exactly. No projection leak. Transition matrix matches ADR-003 cell for cell. Phase 5 (number inventory) is complete — 6 blocks (B055–B060). Proceeding to Phase 6 (reservation engine).
