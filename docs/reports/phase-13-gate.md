# Phase 13 Verification Gate (B110-B112: Configuration Management)

Per the same batched-verification direction as prior phase gates.

## Built

- **B110** — `adminManagePackages` (full-document replace of the `packages` config row, matching the schema/tests already committed for it) and the dedicated `adminConfirmPackagePrice`. `/admin/konfigurasi/paket`: inline-editable label/price/quotas, active/recommended checkboxes, up/down reorder (reassigns `display_order` locally, committed on save), and a separate "Konfirmasi" button per draft-priced package. Two rules the flat `ADMIN_PERMISSIONS` route permission can't express are enforced _inside_ the operation: only `ADMIN_TELKOMSEL` may change `price` (checked per package, per field), and `price_status` can never move through the general save at all — `adminManagePackages` refuses any submitted `price_status` change outright, so confirming a price is only ever possible through the dedicated, audited `adminConfirmPackagePrice` action (OQ-1). Deactivating a package in active use is permitted, not blocked — the response carries a `warnings` array naming the affected pending-order count per package.
- **B111** — `adminManageUniversities` (full-document replace) and `adminUpdatePaymentConfig`. `/admin/konfigurasi/kampus`: add/edit/remove/reorder-free list (no manual reorder needed — alphabetical isn't enforced, insertion order is preserved). Omitting an existing name from the saved list is the delete, and the operation checks `orders` for that name first — refused by name if any exist ("deactivate instead"), otherwise the omission goes through. `/admin/konfigurasi/pembayaran`: QRIS replacement runs through a newly-extracted `reencodeImage` helper (shared with `upload-proof.ts`, which was refactored to use it too — same sniff-validate-decode-re-encode pipeline, now written once) into the public `payment-assets` bucket at a fresh, timestamped path every time, so the previous image is never overwritten and stays retrievable for rollback. A client-side live preview of the _newly selected_ file gates a "I've scanned this and it works" checkbox, which the server also independently requires whenever a file is present — a label-only edit needs neither. **Corrected the pre-existing `ADMIN_PERMISSIONS.adminUpdatePaymentConfig` matrix entry from `"any"` to `"ADMIN_TELKOMSEL"`**, matching the block spec's explicit constraint ("Only ADMIN_TELKOMSEL may change payment configuration") — the value in the committed Phase 10 matrix predated this operation actually being built. Viewing (`GET`) stays open to any admin role, since the same data is already public via `getPaymentConfig`.

## Live verification (real Supabase stack)

Full HTTP walk via `curl` against a freshly rebuilt `next dev` (`.next` wiped):

1. **Packages — role enforcement**: `ADMIN_KAMPUS` changing a price → `403 FORBIDDEN`; `ADMIN_TELKOMSEL` → succeeds.
2. **Packages — price_status is generic-edit-proof**: submitting `price_status: "confirmed"` through the normal save → `422 VALIDATION_FAILED` naming the `price_status` field, even from `ADMIN_TELKOMSEL`.
3. **Packages — confirm endpoint**: `ADMIN_KAMPUS` → `403`; `ADMIN_TELKOMSEL` → succeeds; confirming an already-confirmed package → `409 CONFLICT`.
4. **Packages — deactivation warning**: created a real pending order against `pkg_120gb`, deactivated it — the save **succeeded** (not blocked) and returned `warnings: [{"id":"pkg_120gb","affected_pending_orders":1}]`; the public `/api/packages` immediately stopped listing it.
5. **Universities — deletion guard**: omitting "Universitas Surabaya" (has a real order) → `409 CONFLICT` naming it and suggesting deactivation; omitting "Universitas Ciputra" (no orders) → succeeds.
6. **Payment config — role enforcement**: `ADMIN_KAMPUS` → `403`; viewing (`GET`) works for both roles.
7. **Payment config — scan confirmation**: uploading a new QRIS with `scan_confirmed=false` → `422 VALIDATION_FAILED`; with `true` → succeeds, and the public `/api/payment-config` reflects the new image and label immediately.
8. **Payment config — retention**: uploaded a second replacement image; the _first_ admin-uploaded image's URL is still `200`-retrievable directly from Storage after being superseded.
9. **Audit completeness**: `adminManagePackages` (×2), `adminConfirmPackagePrice`, `adminManageUniversities`, `adminUpdatePaymentConfig` (×2) each have a matching `audit_log` row.
10. **Full suite**: `pnpm run typecheck` / `lint` / `next build` all clean; `pnpm run test` — 361/361 passing (fixed two pre-existing stale tests in `order.test.ts` that predated B104's mandatory `idempotency_key` field, found while running the suite for this gate — unrelated to this phase's own changes but cheap to fix in passing).

## Deferred

- Formal Playwright/component test suites for the three new screens — deferred to the dedicated Testing phase, consistent with every prior gate.
- A literal grep-for-hardcoded-values pass (B112's stated `VERIFY` step) — not run as a separate step in this pass, but every screen and public operation in Phases 7-13 reads packages/universities/payment through `getPackages`/`getUniversities`/`getPaymentConfig`/the new admin config endpoints, never a literal in a component.

## Verdict

Every configuration surface (packages, universities, payment) enforces its role and business rules exactly as specified, changes propagate to the student-facing endpoints immediately (cache TTL aside), and nothing bypasses the audit trail. This closes the block-by-block admin build. Remaining phases (14-17: hardening, testing, operations, final QA) continue next.
