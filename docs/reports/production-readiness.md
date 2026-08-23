# Production Readiness Checklist (B140)

**Objective:** determine, against explicit criteria, whether this system should carry real student orders and real money — today, as built.

Every item below is verified with evidence (a report, a test run, a live check performed in this session) or explicitly marked unmet with its risk and owner. Per this block's own rule, an unmet item is recorded as unmet — this checklist does not always pass.

## Product

- ✅ All in-scope requirements implemented — `docs/reports/traceability-matrix.md`, every row traced to an implementing block and a real test/live verification.
- ✅ No blocking open question unresolved _for this build phase_ — the two genuinely blocking-for-production items are called out separately below, exactly as the original open-questions register always scoped them.
- ❌ **OQ-1 not resolved**: every package price is still `price_status: "draft"`, never flipped to `confirmed`. This requires a real business/Telkomsel pricing decision this session has no authority to make.
- ❌ **OQ-6 not resolved**: the QRIS image is a labeled dev placeholder; no real QRIS asset has ever been scan-verified on a real device, because none was ever supplied.
- ✅ **OQ-4 resolved**: admin bootstrap is a documented, working script (`scripts/bootstrap-admin.ts`), exercised repeatedly this session.

## UX

- ✅ All core flows complete — the full student ordering flow (number → package → data → payment → confirmation → tracking) and the full admin flow (login → dashboard → orders → verify/reject, inventory, configuration) all work end to end, live-verified via Playwright, not just API calls.
- ✅ Loading, error, and empty states implemented on every screen touched in this build — spot-checked in `docs/reports/ux-review.md`.
- ✅ All copy reviewed (`docs/reports/ux-review.md`); no unkept promises found.

## Design

- ⚠️ Visual fidelity verified **against `DESIGN.md`'s tokens**, not against the original five reference screenshots — those were never supplied to this repository (`docs/reports/visual-fidelity-review.md`). Every known divergence is documented and justified.
- ✅ Admin consistent with student — same component library throughout, no parallel design system.

## Backend

- ✅ Every mutation runs server-side — no client Supabase SDK call exists anywhere in the codebase (`code-quality-review.md`'s grep).
- ✅ Reservation concurrency verified: live 20-way concurrent load (Phase 6), E2E Scenario B ×2 live plus ×25 in the nightly workflow — exactly one winner every single time. **Not** verified "by the full suite at full repetition" in the sense of B066's originally-planned dedicated 12-scenario test suite, which was never built as a standalone artifact (explicitly deferred, Phase 6 gate) — the live/E2E coverage that _does_ exist is real and repeated, just narrower than that fuller suite would have been.
- ✅ Lazy expiry proven independent of the cron: Phase 6 pre-seeded an expired-but-uncleaned row and confirmed it behaves as available before the janitor ever touches it; E2E Scenario C repeats this live.

## Security

- ✅ RLS audited: every table, zero policies, live-verified with the actual anon key (Phase 14) and now a standing test suite (`tests/rls/policies.test.ts`).
- ✅ Admin authentication and RBAC verified: E2E Scenarios K and L, live, against every real endpoint.
- ✅ Storage access verified private: anon key denied list/read/sign on the private bucket; public bucket confirmed read-only for anon.
- ✅ Every threat in `SECURITY.md`'s threat model has a documented, attempted, and failed attack on record (`docs/reports/security-review.md`) — twelve attacks attempted, all failed.
- ✅ No secret in the bundle or history (`git grep` + built-bundle grep, Phase 14).

## Data

- ✅ Seed reconciled with a committed report (`docs/reports/seed-reconciliation.md`, pre-existing, showing the expected accepted count).
- ❌ **Packages not configured with confirmed prices** — same gap as OQ-1 above.
- ✅ Universities configured (seeded, admin-editable, deletion-guarded by order history — Phase 13).
- ❌ **QRIS not configured with a real, scan-verified asset** — same gap as OQ-6 above.

## Testing

- ✅ Unit/integration: 372/372 passing.
- ✅ Concurrency: live 20-way (Phase 6) plus repeated E2E Scenario B (2× live, 25× nightly) — real, but narrower than B066's originally-planned dedicated suite (see Backend section above).
- ✅ E2E: all twelve scenarios (A-L) passing, live, against the real Supabase stack — 58/58 across both viewport projects, stable across repeated runs.
- ✅ Accessibility: axe-clean across every screen tested; a real keyboard-only walk of the ordering flow completes with sensible focus management after every navigation.
- ✅ Visual: baselines established at all six required widths (no reference images to regress against, as documented).
- ⚠️ Failure-mode: a genuinely achievable subset automated (missing package/university, malformed tracking request); the rest of the matrix (infrastructure unavailability, network interruption, server restart) requires fault-injection infrastructure this pass didn't build.
- ✅ No unassigned flaky test — the flakiness actually found during this phase (test-data wildcard cleanup colliding under parallelism, admin-login rate-limit collisions) was root-caused and fixed, not quarantined.

## Operations

- ❌ **Deployment never tested** — no staging or production cloud project has existed at any point in this build (`docs/reports/phase-16-gate.md`).
- ❌ **Rollback never rehearsed** — nothing to roll back; no deployment exists.
- ✅ Environment variables documented (`.env.example`, kept current — the unused `NEXT_PUBLIC_*` scaffolding was removed rather than left stale).
- ✅ Cleanup scheduled and observed running (`pg_cron`, live-verified in Phase 6 and surfaced in `/admin/diagnostics`, Phase 16).
- ❌ **Backups never verified by an actual restore** — no real deployment to back up.
- ⚠️ Monitoring and alerting **specified** (`docs/monitoring.md`, every alert linked to a runbook procedure) but not live anywhere, since there's no deployed environment to alert on.

## Documentation

- ✅ README, PRD, DESIGN, AGENTS, ARCHITECTURE, DATA_MODEL, API_SPEC, SECURITY, TEST_PLAN, DEPLOYMENT, OPERATIONS, RUNBOOK all present; the ones that had drifted from the Supabase migration (`SECURITY.md`, `AGENTS.md`, `RUNBOOK.md`) were brought current during Phases 14-17 rather than left describing Firebase.
- ✅ Decision register (`PROJECT_DECISIONS.md`) reflects the major mid-build pivot (the Firebase→Supabase migration) and the significant bugs found and fixed in Phases 15-17.

## Sign-off

**This system is not ready for production**, per this block's own non-negotiable rule that Security and Backend must both be fully met — they are — combined with the plain fact that Data and Operations are not:

- Data is blocked on two already-known, already-scoped business decisions (OQ-1 price confirmation, OQ-6 a real QRIS asset) that no engineering work in this session could resolve.
- Operations is blocked because **no real deployment has ever existed** for this build to exercise deployment, rollback, or backup/restore against — an environmental constraint of where this build happened, not a shortcut.

**What is genuinely production-grade today:** the core correctness guarantee (no number sold twice, proven under real concurrent load), the full admin and student flows (including catching and fixing two bugs — a broken checkout form and crashing admin pages — that would have shipped completely broken had this build stopped at Phase 13 without Phase 15's real browser testing), the security posture (every named threat attempted and failed), and the observability/health-check foundation a real deployment would build on immediately.

**What remains before this could go live:** a business decision on pricing, a real QRIS asset, and — the largest remaining step — actually deploying this to a real Supabase project and exercising Phases 16's deferred operational work (staging, production, rollback rehearsal, a real timed backup restore) against it, none of which this local-only build environment could ever have done.
