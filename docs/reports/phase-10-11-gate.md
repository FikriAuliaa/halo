# Phase 10-11 Verification Gate (B093-B104: Admin Authentication, Dashboard, Orders)

Per the same "don't test/commit every block" direction as [phase-6-gate.md](phase-6-gate.md) and [phase-7-9-progress.md](phase-7-9-progress.md): built as one batch, verified live against the real local Supabase stack (`supabase start`, not a stub) rather than block-by-block.

## Built

- **B093-094** — Admin login: `POST /api/admin/session` (rate-limited per-IP and per-email, both fail-closed; identical error for wrong password vs. unknown account), `GET`/role lookup via `admin_users`, `halo_admin_session` httpOnly/Secure/SameSite=Strict cookie (`src/server/auth/session-cookie.ts`), `verifyAdminToken`/`verifyAdminSession` with silent refresh (`src/server/auth/admin-auth.ts`).
- **B095** — `middleware.ts`: coarse cookie-presence gate on `/admin/*` (documented as UX-only; every route re-verifies independently), `require-admin.ts` guard for Server Components (no refresh attempt — Server Components can't set cookies).
- **B096** — Logout (`DELETE /api/admin/session`): revokes server-side via `supabaseAdmin.auth.admin.signOut(token, "global")`, not just a cleared cookie.
- **B098** — RBAC: `src/domain/permissions.ts`'s `ADMIN_PERMISSIONS` matrix, single source of truth for both server enforcement (`createHandler`'s `requireRole`) and client UI hiding (`RoleGate`). All prior admin routes retrofitted to import from it instead of hardcoded role strings.
- **B099** — Admin shell/nav (`admin-shell.tsx`, `admin-nav.tsx`), login page, unauthorized page.
- **B100** — Dashboard: `adminGetDashboardMetrics` (30s cache, SQL aggregation via `count(*) filter`, pg_cron staleness check wrapped in try/catch since `cron.job_run_details` may not exist), `metric-card.tsx`, `alerts-panel.tsx`.
- **B101** — Order list: `OrderRepository.list()` rewritten for filters (status, university, package_id, date range, search incl. phone-aware normalization), sort, offset pagination; `adminListOrders` (excludes proof path/tracking hash from the list projection); `data-table.tsx`/`filter-bar.tsx`/`orders-table.tsx`; URL-synced filters/sort/page on `/admin/pesanan`.
- **B102** — Order detail: `adminGetOrder`, `/admin/pesanan/[id]`.
- **B103** — Proof viewer: `adminGetProofUrl` (fresh 5-minute signed URL per call, audited on every access), `proof-viewer.tsx` (zoom/rotate, mints its own URL on mount).
- **B104** — Verify/reject: `adminVerifyPayment`/`adminRejectPayment`, both idempotency-keyed, both re-check `status === 'pending'` inside the transaction and throw `CONFLICT` otherwise, both write an audit log row.

## Live verification (real Supabase stack: Postgres + GoTrue + Storage + Kong)

Full HTTP walk via `curl` and a cookie jar against `next dev`, restarted clean (`.next` wiped) between passes:

1. **Login** — `admin@halo.test` → `{"role":"ADMIN_TELKOMSEL"}`, session cookie set.
2. **Dashboard** — real aggregate counts, `recent_orders`, `alerts.cleanup_job_last_run_minutes_ago` all correct against the seeded pending order.
3. **Order list** (`GET /api/admin/orders`) and **order detail** (`GET /api/admin/orders/{id}`) — correct data, matches DB state.
4. **Proof viewer** (`POST /api/admin/orders/{id}/proof-url`) — signed URL resolves to the actual uploaded JPEG (`content-type: image/jpeg`, correct byte size).
5. **Verify** (`POST /api/admin/orders/{id}/verify`) — moves `pending` → `verified`, `verified_by`/`verified_at` set; **replaying the identical idempotency key returns the same result, not a duplicate side effect**.
6. **Reject after verify** — correctly refused with `409 CONFLICT` ("sudah diproses sebelumnya"), not silently accepted or silently ignored.
7. **Multi-admin sequencing** — logged in as a second admin (`kampus@halo.test`, `ADMIN_KAMPUS`) mid-session, then re-exercised the first admin's proof-url call — still resolves correctly (regression check for the bug below).

## Found and fixed: shared client session poisoning (proof-url "Object not found")

The most significant bug this pass caught: `adminGetProofUrl` intermittently failed with `"Object not found"` for a payment-proof file that demonstrably existed (confirmed via direct Storage REST calls). `storage.list()` on the same client, in the same request, returned an empty array — not an error, a clean empty success — which was the key clue once request/response logging was added at the fetch layer.

Root cause: `POST /api/admin/session`'s login handler called `supabaseAdmin.auth.signInWithPassword(...)` **on the shared, singleton service-role client** (the same object every repository and Storage call in the app uses). `signInWithPassword` mutates that client instance's internal session state; from that point on, every subsequent request made through the _same client instance_ — including unrelated Storage calls made on behalf of other requests — carried the logged-in admin's own `authenticated`-role JWT instead of the service-role key. Since RLS is enabled with zero policies everywhere (deny-by-default, by design), those requests silently returned nothing rather than erroring loudly. `verifyAdminSession`'s silent-refresh path had the identical bug via `supabaseAdmin.auth.refreshSession(...)`.

This was **not** a caching or env-var problem, despite three rounds of investigation initially assuming so (a prior pass added `globalThis` staleness protection to `supabase-admin.ts`, which was harmless but did not fix this). The actual fix: added `createScopedAuthClient()` to `src/lib/supabase-admin.ts` — a brand-new, never-cached, never-shared client used only for the two session-mutating calls (`signInWithPassword` in the login route, `refreshSession` in `verifyAdminSession`). `supabaseAdmin.auth.getUser(token)` and `supabaseAdmin.auth.admin.signOut(...)` were confirmed safe to leave as-is: the former doesn't mutate client session state when passed an explicit token, and the latter is the Admin API namespace, which revokes a token server-side without touching the calling client's own session.

Verified via the "multi-admin sequencing" check above: after this fix, sequential logins by different admins no longer disturb `supabaseAdmin`'s Storage calls at all.

## Deferred

- Formal Playwright/component test suites for the admin UI — deferred to the dedicated Testing phase, consistent with Phase 6/7-9.
- RBAC negative-path testing beyond what the permission matrix already declares (`adminVerifyPayment`/`adminRejectPayment` are intentionally `"any"` role, not role-restricted — both admin roles are allowed to process payments by design, so no denial case exists to test there). `adminForceReleaseReservation`'s `ADMIN_TELKOMSEL`-only restriction was already live-verified in Phase 6.

## Verdict

Admin auth, dashboard, and the order verification/rejection path are live-verified against the real Supabase stack, including the idempotency and double-processing guards on the financially-sensitive verify/reject actions. The proof-url bug is fixed at its actual root cause (shared-client session mutation), not papered over. Proceeding to Phase 12 (Admin Number Inventory).
