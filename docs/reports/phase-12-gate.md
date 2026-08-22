# Phase 12 Verification Gate (B106-B109: Admin Number Inventory)

Per the same batched-verification direction as prior phase gates.

## Built

- **B106** — `/admin/nomor` (under the `(dashboard)` route group, like `pesanan` — the block spec's literal path predates that grouping): `NumbersTable` shows **effective** status (via `getEffectiveStatus`, the same function `reserveNumber`'s guard uses) with a visible `(tersimpan: X, kedaluwarsa)` note whenever the stored status disagrees with it; filter by status, digit search, sortable columns, offset pagination. `NumberRepository.list()` added (offset+sort, mirroring `OrderRepository.list`'s B101 precedent — the keyset-only rule stays reserved for the high-churn _public_ listing).
- **B107** — `AddNumberDialog` (single, fast path) and `BulkAddDialog` (paste-many with a mandatory preview step). New read-only `adminPreviewAddNumbers` operation / `POST /api/admin/numbers/preview` classifies every pasted entry (valid / already in inventory / duplicate within the paste / invalid+reason) against the real database **without writing anything**, using the identical classification logic `adminAddNumbers` itself uses, so preview and commit can never disagree. Client-side 200-entry cap with a clear message before the request.
- **B108** — `NumberActions`: remove, mark-sold-offline, force-release, and "correct number" wired per-row with `ConfirmDialog`/`Dialog`. Confirmation copy names the specific number and consequence (e.g. "Hapus nomor 0811 - 9999 - 0001?"). Force-release states the student will lose their reservation. "Status override" is `adminUpdateNumber`'s rename path (per the resolution already recorded in [phase-5-gate.md](phase-5-gate.md): a number's status is never bypassed directly, only corrected via delete-and-recreate) — renaming requires typing the original number to confirm, since it's irreversible under the old key; reason-only annotation (no rename) is available unconditionally. Every row action is gated client-side by the exact same eligibility rule the operation itself enforces (`getEffectiveStatus`/`canTransition` for mark-sold-offline; each operation's own status/role guard for the rest), so the UI never dangles an action the server would refuse.

## Live verification (real Supabase stack)

Full HTTP walk via `curl`, restarted clean (`.next` wiped):

1. **List/filter/sort/search** — `sort_field=number&sort_direction=asc`, `status=sold`, `search=1234` all return correct, real data (96 seeded numbers, exactly 1 `sold`).
2. **Add single** — `081199990001` created.
3. **Bulk preview** — `[new, existing-dup, batch-dup, invalid]` classified exactly right (`valid`, `duplicate_existing`, `duplicate_in_batch`, `invalid` with the real `normalizePhone` rejection reason); **no audit row written** for the preview call.
4. **Bulk commit** — same batch committed; outcomes (`created`/`already_present`/`duplicate_in_batch`/`invalid`) matched the preview exactly.
5. **Mark sold offline** → **remove refused with `409 CONFLICT`** (only `available` numbers can be removed) → **removing an `available` number succeeds**.
6. **E2E scenario J** — a `sold_offline` number correctly returns `409 NUMBER_UNAVAILABLE` when a student attempts `POST /api/numbers/{id}/reserve`.
7. **Correct/rename** — renamed an available, never-reserved number; old key gone, new key present. Reason-only annotation (no `number` field) on an unrelated `sold_offline` number succeeded without touching its status.
8. **Force-release** — reserved a number as a student, force-released it as `ADMIN_TELKOMSEL`, confirmed it's `available` again with reservation fields cleared.
9. **RBAC** — `ADMIN_KAMPUS` attempting mark-sold-offline and force-release both correctly refused with `403 FORBIDDEN`.
10. **Audit completeness** — every mutating action above (`adminAddNumbers` ×2, `adminMarkSoldOffline`, `adminRemoveNumber`, `adminUpdateNumber` ×2, `adminForceReleaseReservation`) has a matching `audit_log` row with the actor and reason; the preview call has none, confirming it's genuinely read-only.

## Deferred

- Formal Playwright/component test suites — deferred to the dedicated Testing phase, consistent with every prior gate.
- Axe audits on the new screens — not run in this pass; same deferral as Phase 7-9's screens (no automated a11y tooling wired into this workflow yet).

## Verdict

Every inventory action, legal and illegal, behaves exactly as the server defines it; a `sold_offline` number is confirmed unreservable; the audit trail is complete for every write. Proceeding to Phase 13 (Configuration Management).
