# PART D — CLAUDE CODE BLOCKS · Phases 14–17 (B113–B140)

> Prepend **SP-1** (see `01_BLOCKS_PHASE_0-2.md`) to every block.

---

# PHASE 14 — HARDENING

### B113 — Security rules final audit
`PHASE: 14 · TYPE: Security · SIZE: M · DEPS: B112 · PARALLEL: no`

**TASK:** Re-audit `firestore.rules` and `storage.rules` against the finished implementation. Every rule is justified by a named requirement; every exception to deny-by-default is commented with the reason and the operation that needs it. Expand the rules test suite to cover every collection and every path against anonymous, authenticated-non-admin, `ADMIN_KAMPUS`, and `ADMIN_TELKOMSEL`.

**MODIFY:** `firestore.rules`, `storage.rules`, `tests/rules/*`
**CONSTRAINTS:** Because all production access is server-mediated through the Admin SDK, these rules are the backstop for a leaked client config, not the primary control — write them as if the client config is already public, because it effectively is. Any rule that cannot be justified is removed rather than kept "just in case".
**ACCEPTANCE:** Every collection and storage path is covered by a test for all four identities; no unjustified exception remains; a leaked client config grants nothing meaningful.
**VERIFY:** Attempt, from a real client SDK with the production config, to read a number, an order, and a proof. All three must fail.
**STOP IF:** Any client identity can read order PII or a payment proof.
**COMMIT:** `security(rules): complete security rules audit and coverage`

---

### B114 — Firebase App Check
`PHASE: 14 · TYPE: Security · SIZE: M · DEPS: B113 · PARALLEL: no`

**TASK:** Enable App Check with reCAPTCHA Enterprise for the web app. Enforce it on the public student endpoints (numbers, reservations, orders, tracking). Run in monitoring mode first, review the metrics, then enforce.

**CREATE:** `src/lib/app-check.ts`; **MODIFY:** operation framework
**CONSTRAINTS:** Monitor before enforcing — turning on enforcement blind will lock out some legitimate browser and privacy configurations, and discovering that in production is expensive. Admin endpoints already require an authenticated session and do not need App Check. Provide a documented debug token path for local development and E2E, never a bypass that could ship enabled.
**ACCEPTANCE:** Tokens are verified on public endpoints; monitoring mode records metrics; the debug path works locally; production has no bypass; a missing token in enforcement mode is refused with a clear error.
**TESTING:** Integration tests for token verification and the debug path.
**DOCS:** Record the monitoring-then-enforce rollout in `DEPLOYMENT.md`.
**COMMIT:** `security(app-check): add app check verification on public endpoints`

---

### B115 — Abuse prevention review
`PHASE: 14 · TYPE: Security · SIZE: M · DEPS: B114 · PARALLEL: no`

**TASK:** Review and tune every rate limit against realistic campus usage: number listing, reservation attempts, order submission, tracking lookup, and admin login. Add a per-session reservation-churn limit (repeatedly reserving and releasing to hoard the pool). Add a per-IP cap on concurrent sessions.

**MODIFY:** rate limit configuration and operation framework
**CONSTRAINTS:** Limits must be sized against a campus behind shared NAT, where hundreds of legitimate students may share one address. A per-IP limit tight enough to stop one abuser can lock out a whole faculty; prefer per-session limits for fairness controls and reserve per-IP limits for the brute-force surfaces (tracking, login). Every limit is config-driven so it can be tuned without a deploy.
**ACCEPTANCE:** Limits are documented with their rationale; the churn limit prevents hoarding without blocking a student legitimately changing their mind twice; shared-NAT scenarios are tested; all limits are config-driven.
**TESTING:** Integration tests for each limit, including a simulated shared-NAT burst of legitimate traffic.
**COMMIT:** `security(abuse): tune rate limits and add reservation churn protection`

---

### B116 — Security headers and content security policy
`PHASE: 14 · TYPE: Security · SIZE: M · DEPS: B115 · PARALLEL: no`

**TASK:** Configure `Content-Security-Policy` (nonce-based for scripts), `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy` (`no-referrer` on the tracking route per B090, `strict-origin-when-cross-origin` elsewhere), `X-Frame-Options`/`frame-ancestors`, and `Permissions-Policy` denying camera, microphone, and geolocation.

**MODIFY:** `next.config.ts`, `src/middleware.ts`
**CONSTRAINTS:** Deploy CSP in report-only mode first and review the reports before enforcing — a CSP that breaks the QRIS image or the font loading is a broken payment flow. No `unsafe-inline` for scripts; use nonces. Allow only the Firebase and font origins actually required, enumerated explicitly.
**ACCEPTANCE:** All headers present in production responses; CSP enforces without breaking fonts, images, or Firebase; report-only findings reviewed and resolved; tracking route sets `no-referrer`.
**VERIFY:** Walk every page with the console open and confirm zero CSP violations.
**TESTING:** Integration tests asserting headers on representative routes.
**COMMIT:** `security(headers): add content security policy and security headers`

---

### B117 — Secrets and PII audit
`PHASE: 14 · TYPE: Security · SIZE: M · DEPS: B116 · PARALLEL: no`

**TASK:** Audit the repository and the built bundle for secrets. Verify no service account key, API secret, or credential is tracked or bundled. Verify every `NEXT_PUBLIC_*` variable is genuinely safe to expose. Audit logs from a full flow run for PII leakage. Verify the tracking token plaintext appears nowhere persisted. Document the complete PII inventory with its retention rule.

**CREATE:** `docs/reports/security-audit.md`
**CONSTRAINTS:** Inspect the **built** client bundle, not only the source — a secret imported into a client component is inlined at build time and is invisible in a source grep. Run a full student and admin flow, then grep the collected logs for each PII field and for the token.
**ACCEPTANCE:** No secret in the repository, the history, or the client bundle; every `NEXT_PUBLIC_*` variable justified; logs contain no unredacted PII; the token plaintext is absent from all persisted output; the PII inventory is complete with retention rules.
**VERIFY:** Grep the production build output for each secret value; scan Git history for previously committed secrets.
**STOP IF:** Any secret is found in the bundle or in history — history rewriting and credential rotation are required before proceeding.
**COMMIT:** `security(audit): complete secrets and PII exposure audit`

---

### B118 — Phase 14 verification gate
`PHASE: 14 · TYPE: Gate · SIZE: S · DEPS: B113–B117 · PARALLEL: no`

**TASK:** Re-run every security test. Confirm each threat in `SECURITY.md` has an implemented mitigation and a passing verification. Update `SECURITY.md` to reflect what was actually built.

**ACCEPTANCE:** Every threat has a mitigation and a passing test; `SECURITY.md` matches the implementation; all suites pass.
**STOP IF:** Any threat lacks a verification.
**COMMIT:** `chore(security): close phase 14 hardening gate`

---

# PHASE 15 — TESTING

Most unit and integration tests were written alongside their features. This phase adds the end-to-end, accessibility, visual, and failure-mode layers, and wires everything into CI.

### B119 — E2E scenarios A–E (happy path and reservation lifecycle)
`PHASE: 15 · TYPE: Testing · SIZE: L · DEPS: B118 · PARALLEL: no`

**TASK:** Implement Playwright tests for: **A** — a student selects an available number and completes an order; **B** — two students attempt the same number near-simultaneously and exactly one succeeds; **C** — a reservation timer expires and the number returns to the pool; **D** — a browser refresh during an active reservation preserves it with continuous remaining time; **E** — a submission after expiry is refused safely.

**CREATE:** `tests/e2e/scenarios-a-e.spec.ts`, `tests/e2e/fixtures/*`, `tests/e2e/helpers/seed.ts`
**CONSTRAINTS:** Each test seeds and tears down its own isolated data — shared state between E2E tests produces order-dependent failures that waste days. Scenario B uses two genuinely independent browser contexts. Scenario C manipulates server-side time rather than waiting fifteen real minutes. Assert against the database state, not only the UI, since a UI can lie.
**ACCEPTANCE:** All five scenarios pass reliably across ten consecutive runs; each is independent; database state is asserted alongside UI state.
**TESTING:** This block is the test.
**COMMIT:** `test(e2e): add student happy path and reservation lifecycle scenarios`

---

### B120 — E2E scenarios F–I (upload and admin verification)
`PHASE: 15 · TYPE: Testing · SIZE: L · DEPS: B119 · PARALLEL: no`

**TASK:** Implement: **F** — an invalid file upload is rejected by the UI and by the server; **G** — a valid proof upload results in a pending order; **H** — an admin verifies payment, the order becomes verified and the number becomes sold; **I** — an admin rejects payment, the order becomes rejected and the number returns to available.

**CREATE:** `tests/e2e/scenarios-f-i.spec.ts`
**CONSTRAINTS:** Scenario F tests the server rejection too, by bypassing the client check — otherwise it only proves the client guard exists. Scenarios H and I assert both documents transitioned atomically and that the audit record was written. Use real fixture image files, including a polyglot.
**ACCEPTANCE:** All four pass reliably; F verifies both tiers; H and I assert atomicity and audit.
**COMMIT:** `test(e2e): add upload and admin verification scenarios`

---

### B121 — E2E scenarios J–L (offline sales and authorization)
`PHASE: 15 · TYPE: Testing · SIZE: M · DEPS: B120 · PARALLEL: no`

**TASK:** Implement: **J** — an admin marks a number sold offline and a student cannot reserve it; **K** — an unauthenticated user is denied access to the admin area, both by page navigation and by direct API call; **L** — `ADMIN_KAMPUS` attempts each Telkomsel-only operation and is refused at the server.

**CREATE:** `tests/e2e/scenarios-j-l.spec.ts`
**CONSTRAINTS:** Scenario K tests direct API calls as well as navigation — a redirect on the page route means nothing if the endpoint is open. Scenario L iterates the full permission matrix rather than sampling it.
**ACCEPTANCE:** All three pass; K covers both surfaces; L covers every Telkomsel-only operation.
**COMMIT:** `test(e2e): add offline sales and authorization scenarios`

---

### B122 — Accessibility test suite
`PHASE: 15 · TYPE: Testing · SIZE: M · DEPS: B121 · PARALLEL: no`

**TASK:** Run axe across every student and admin page in every significant state. Add keyboard-only navigation tests for the full ordering flow and the admin verification workflow. Test focus management across route changes and dialogs. Verify contrast against the recorded `DESIGN.md` values. Test with reduced motion enabled.

**CREATE:** `tests/a11y/*.spec.ts`
**CONSTRAINTS:** Automated tooling catches perhaps a third of real accessibility problems; the keyboard-only tests matter more than the axe pass. Complete the entire ordering flow without touching a mouse and assert the focus target after every navigation.
**ACCEPTANCE:** Zero serious or critical axe violations across all pages and states; the full flow is completable by keyboard; focus lands sensibly after every route change and dialog close; contrast values match those recorded.
**STOP IF:** The flow cannot be completed by keyboard.
**COMMIT:** `test(a11y): add accessibility and keyboard navigation test suite`

---

### B123 — Responsive and visual regression suite
`PHASE: 15 · TYPE: Testing · SIZE: M · DEPS: B122 · PARALLEL: yes`

**TASK:** Capture Playwright screenshots of every screen at 320, 390, 600, 768, 1024, and 1440 px. Establish baselines. Add a comparison against the five supplied reference screenshots for the student screens, documenting every intentional divergence with its reason.

**CREATE:** `tests/visual/*.spec.ts`, `tests/visual/baselines/*`
**CONSTRAINTS:** Mask genuinely dynamic regions (timers, timestamps) or the suite fails on every run and gets ignored. Use a fixed viewport, a fixed device pixel ratio, and disabled animations. Divergences from the reference are listed explicitly and justified — an undocumented divergence is treated as a regression.
**ACCEPTANCE:** Baselines captured at all six widths; no layout breaks at any width; every divergence from the reference is documented with a reason; the suite is stable across runs.
**COMMIT:** `test(visual): add responsive and visual regression coverage`

---

### B124 — Failure-mode tests
`PHASE: 15 · TYPE: Testing · SIZE: L · DEPS: B123 · PARALLEL: no`

**TASK:** Implement tests for each row of the failure-mode matrix (Part G): Firestore unavailable, Storage unavailable, the scheduled function failing, a network interruption mid-upload, a server restart during a reservation, a deleted configuration document, a missing package, a missing university, and a malformed tracking request. For each, assert detection, user-facing behaviour, server behaviour, and recovery.

**CREATE:** `tests/failure-modes/*.test.ts`
**CONSTRAINTS:** Inject failures rather than mocking them away — an unavailable Firestore is simulated by pointing at a dead emulator, not by stubbing the repository, or the test proves nothing about real behaviour. Every failure must produce a user-facing message that is honest and actionable, never a blank screen or a raw error.
**ACCEPTANCE:** Every matrix row has a test; no failure produces a blank screen or an unhandled rejection; recovery works where recovery is possible; a deleted config document degrades to a clear error rather than a crash.
**COMMIT:** `test(resilience): add failure mode and degradation tests`

---

### B125 — Continuous integration pipeline
`PHASE: 15 · TYPE: DevOps · SIZE: M · DEPS: B124 · PARALLEL: no`

**TASK:** Configure CI to run on every pull request: install, lint, typecheck, unit tests, emulator-backed integration and rules tests, build, E2E, and accessibility. Cache dependencies and Playwright browsers. Upload failure artefacts (traces, screenshots, videos). Run the full concurrency suite at its full repetition count on a schedule rather than on every PR, to keep PR feedback fast.

**CREATE:** `.github/workflows/ci.yml`, `.github/workflows/nightly.yml`
**CONSTRAINTS:** The PR pipeline must finish fast enough that people actually wait for it — a pipeline people learn to ignore is worse than none. Move the slow, high-repetition concurrency suite to the nightly run. Fail the build on any lint error, type error, or test failure; no soft warnings.
**ACCEPTANCE:** PR pipeline completes in a reasonable time; all suites run; artefacts are uploaded on failure; the nightly concurrency run works; a deliberately broken commit fails the build.
**VERIFY:** Open a PR with a deliberate type error and confirm it fails, then revert.
**COMMIT:** `ci(github): add continuous integration and nightly pipelines`

---

### B126 — Phase 15 verification gate
`PHASE: 15 · TYPE: Gate · SIZE: M · DEPS: B119–B125 · PARALLEL: no`

**TASK:** Run every suite. Review coverage against `TEST_PLAN.md` expectations. Confirm every business rule in `PRD.md` has at least one passing test. Confirm all twelve E2E scenarios pass. Quarantine and assign any flaky test with a deadline.

**ACCEPTANCE:** All suites green; coverage meets the differentiated expectations; every business rule is covered; no unassigned flaky test remains.
**STOP IF:** Any E2E scenario is failing or persistently flaky.
**COMMIT:** `chore(testing): close phase 15 testing gate`

---

# PHASE 16 — OPERATIONAL READINESS

### B127 — Structured logging and monitoring
`PHASE: 16 · TYPE: DevOps · SIZE: M · DEPS: B126 · PARALLEL: no`

**TASK:** Verify structured logging across every operation with consistent fields and correlation IDs. Configure log-based metrics for reservation success and failure rates, order submission rate, verification latency, cleanup job outcomes, and error rates by code. Configure alerts: cleanup not run in 15 minutes, error rate above threshold, pending orders older than 24 hours, upload failure rate elevated, and rate-limit rejections spiking.

**CREATE:** `docs/monitoring.md`; **MODIFY:** observability modules
**CONSTRAINTS:** Alerts must be actionable and rare — every alert names the runbook procedure that resolves it. An alert nobody can act on trains people to ignore all alerts, including the one that matters. Metrics carry no PII.
**ACCEPTANCE:** All operations log consistently with correlation IDs; metrics populate; every alert links to a runbook procedure; no PII in any metric label.
**TESTING:** Trigger each alert condition in staging and confirm it fires.
**COMMIT:** `feat(observability): add log-based metrics and operational alerts`

---

### B128 — Health checks and readiness
`PHASE: 16 · TYPE: DevOps · SIZE: S · DEPS: B127 · PARALLEL: yes`

**TASK:** Implement `/api/health` (liveness — process responding) and `/api/health/ready` (readiness — Firestore reachable, config documents present, Storage reachable). Add an admin-only diagnostics view showing the last cleanup run, configuration state, and connection status.

**CREATE:** `src/app/api/health/route.ts`, `src/app/api/health/ready/route.ts`, `src/app/(admin)/admin/diagnostics/page.tsx`
**CONSTRAINTS:** Liveness must not depend on Firestore, or a transient database blip restarts a healthy application. Readiness may. Neither endpoint reveals version numbers, dependency versions, or internal hostnames to unauthenticated callers.
**ACCEPTANCE:** Liveness stays green when Firestore is down; readiness goes red; neither leaks internal detail; diagnostics is admin-only.
**TESTING:** Integration tests with Firestore unavailable.
**COMMIT:** `feat(ops): add health check and readiness endpoints`

---

### B129 — Staging deployment
`PHASE: 16 · TYPE: DevOps · SIZE: L · DEPS: B128 · PARALLEL: no`

**TASK:** Provision the staging Firebase project. Deploy rules, indexes, functions, and the application. Configure secrets. Bootstrap the admin account. Seed numbers and configuration. Run the smoke test checklist. Verify the scheduled function executes on schedule.

**CREATE:** `docs/reports/staging-deployment.md`, `scripts/smoke-test.ts`
**CONSTRAINTS:** Deploy in dependency order: rules and indexes before the application, since an application deployed against missing indexes fails on first query. Verify the scheduled function actually runs — a misconfigured Cloud Scheduler trigger is silent, and its absence would only surface as slowly accumulating stale reservations. Staging holds no real student PII.
**ACCEPTANCE:** All artefacts deployed; smoke tests pass against staging; the scheduled function has demonstrably executed; a full student and admin flow completes; the deployment log records every step and its duration.
**VERIFY:** Wait for at least two scheduled invocations and confirm both in the logs.
**STOP IF:** Any smoke test fails, or the scheduled function does not run.
**COMMIT:** `chore(deploy): deploy and verify staging environment`

---

### B130 — Production deployment and rollback rehearsal
`PHASE: 16 · TYPE: DevOps · SIZE: L · DEPS: B129 · PARALLEL: no`

**TASK:** Prepare the production project and execute a controlled deployment. Then **rehearse the rollback** in staging: roll back the application, the rules, the indexes, and the functions, and document what each actually does, including what cannot be rolled back.

**CREATE:** `docs/reports/production-deployment.md`; **MODIFY:** `DEPLOYMENT.md`
**CONSTRAINTS:** Rehearse rollback before it is needed, not during an incident. Document honestly that rules and index rollbacks behave differently from application rollbacks, and that a data migration cannot be rolled back at all — the recovery is a restore. Production seeding runs with `--confirm-production` and its reconciliation report is committed.
**ACCEPTANCE:** Production deployment succeeds; the rollback rehearsal is completed and documented per artefact type; non-rollbackable changes are identified explicitly; the production seed report shows the expected 96 accepted.
**STOP IF:** The rollback rehearsal fails for any artefact.
**COMMIT:** `chore(deploy): execute production deployment and rollback rehearsal`

---

### B131 — Backup and disaster recovery
`PHASE: 16 · TYPE: DevOps · SIZE: M · DEPS: B130 · PARALLEL: no`

**TASK:** Configure scheduled Firestore exports to Cloud Storage with a retention policy. Configure Storage bucket versioning for payment proofs. Document the restore procedure and **test it** by restoring an export into a scratch project. Document the recovery point and recovery time objectives honestly, based on the measured restore.

**CREATE:** `docs/disaster-recovery.md`; **MODIFY:** `RUNBOOK.md`
**CONSTRAINTS:** An untested backup is not a backup. Perform an actual restore and record how long it took — a stated RTO not derived from a real restore is a guess. Document what is lost between exports.
**ACCEPTANCE:** Exports run on schedule; a restore has been performed and timed; RPO and RTO are derived from the measured restore; the procedure is followable by someone who did not write it.
**STOP IF:** The test restore fails or produces inconsistent data.
**COMMIT:** `chore(ops): configure and verify backup and disaster recovery`

---

### B132 — Phase 16 verification gate
`PHASE: 16 · TYPE: Gate · SIZE: S · DEPS: B127–B131 · PARALLEL: no`

**TASK:** Verify monitoring, alerting, health checks, deployment, rollback, and backups are all functioning in staging. Confirm every runbook procedure has been walked at least once.

**ACCEPTANCE:** All operational capabilities verified in a real environment, not merely configured; every runbook procedure has been executed once.
**STOP IF:** Any capability is configured but unverified.
**COMMIT:** `chore(ops): close phase 16 operational readiness gate`

---

# PHASE 17 — FINAL QA AND PRODUCTION READINESS

### B133 — Requirement traceability review
`PHASE: 17 · TYPE: QA · SIZE: M · DEPS: B132 · PARALLEL: yes`

**TASK:** Complete the traceability matrix (Part F): for every `REQ-###`, record its PRD section, architecture section, implementing blocks, tests, and acceptance criteria. Identify any requirement without an implementation or without a test.

**CREATE:** `docs/reports/traceability-matrix.md`
**ACCEPTANCE:** Every requirement is traced or explicitly deferred with a reason; no business rule lacks a test; gaps are listed with remediation blocks.
**STOP IF:** A confirmed in-scope requirement has no implementation.
**COMMIT:** `docs(qa): complete requirement traceability matrix`

---

### B134 — Security review
`PHASE: 17 · TYPE: QA · SIZE: M · DEPS: B132 · PARALLEL: yes`

**TASK:** Conduct a full security review against the threat model. Attempt each listed attack manually: admin bypass, IDOR on orders, tracking enumeration, direct Storage access, malicious upload, direct Firestore write, reservation hoarding, brute-forcing a tracking token, and client-side privilege escalation. Record the outcome of each attempt.

**CREATE:** `docs/reports/security-review.md`
**CONSTRAINTS:** Actually attempt each attack rather than reviewing the code and concluding it would fail. Record the exact request made and the exact response received.
**ACCEPTANCE:** Every threat has a documented, attempted, and failed attack; any success is a blocking finding with a remediation block.
**STOP IF:** Any attack succeeds.
**COMMIT:** `docs(qa): complete security review with attempted exploits`

---

### B135 — Visual fidelity review
`PHASE: 17 · TYPE: QA · SIZE: M · DEPS: B132 · PARALLEL: yes`

**TASK:** Compare every student screen against its reference screenshot at 390 px: spacing, typography hierarchy, gradients, dark surfaces, red and orange emphasis, radii, the package scroller's horizontal behaviour, form hierarchy, payment presentation, and the confirmation state. Verify the admin interface uses the same design language. Document every divergence with its justification.

**CREATE:** `docs/reports/visual-fidelity-review.md`
**CONSTRAINTS:** Intentional divergences (the added timer, the rewritten confirmation copy, the search input, desktop layouts) are listed with the contradiction or decision that produced them. Unintentional divergences are defects, not variations.
**ACCEPTANCE:** All five student screens reviewed; every divergence is either justified or filed as a defect; the admin interface is confirmed consistent.
**COMMIT:** `docs(qa): complete visual fidelity review against design references`

---

### B136 — UX and content review
`PHASE: 17 · TYPE: QA · SIZE: M · DEPS: B135 · PARALLEL: yes`

**TASK:** Review every user-facing string for clarity, tone, correct Indonesian, and consistency. Verify no message promises behaviour the system does not deliver (the confirmation-copy problem, C9). Verify every error message is actionable. Walk the flow as a first-time student and note friction.

**CREATE:** `docs/reports/ux-review.md`
**CONSTRAINTS:** Check every string in the codebase, not just the ones that appear on the happy path — error and empty states are exactly where careless copy survives to production.
**ACCEPTANCE:** All strings reviewed; no unkept promises; every error is actionable; friction points are logged with severity.
**COMMIT:** `docs(qa): complete UX and content review`

---

### B137 — Performance review
`PHASE: 17 · TYPE: QA · SIZE: M · DEPS: B132 · PARALLEL: yes`

**TASK:** Measure Core Web Vitals on each student screen on a throttled mobile profile. Measure API response times under realistic load. Check the bundle size and identify the largest contributors. Verify images are optimised and fonts do not block render.

**CREATE:** `docs/reports/performance-review.md`
**CONSTRAINTS:** Test on a throttled 3G profile with mid-tier mobile CPU throttling — this is a student-facing product on campus networks, and desktop-broadband numbers are not evidence. The QRIS image must not be degraded by optimisation to the point where it fails to scan.
**ACCEPTANCE:** Core Web Vitals measured and recorded per screen; API latencies recorded; bundle contributors identified; the QRIS still scans after optimisation; regressions are filed with remediation.
**COMMIT:** `docs(qa): complete performance review`

---

### B138 — Code quality and documentation review
`PHASE: 17 · TYPE: QA · SIZE: M · DEPS: B133–B137 · PARALLEL: no`

**TASK:** Review the codebase against the `AGENTS.md` prohibitions: no client SDK writes, no client-side enforcement of server rules, no business logic in components, no unjustified `any`, no hardcoded business values, no secrets. Verify layering. Verify every document is current. Confirm the decision register captures every significant decision.

**CREATE:** `docs/reports/code-quality-review.md`
**ACCEPTANCE:** No prohibition is violated; layering holds; every document matches the implementation; the decision register is complete; any violation is filed with a remediation block.
**VERIFY:** Run the automated greps from the `AGENTS.md` prohibitions list and confirm each returns clean.
**COMMIT:** `docs(qa): complete code quality and documentation review`

---

### B139 — Remediation of review findings
`PHASE: 17 · TYPE: QA · SIZE: L · DEPS: B138 · PARALLEL: no`

**TASK:** Address every blocking finding from B133–B138. Triage non-blocking findings into a prioritised backlog with owners. Re-run every affected test.

**CREATE:** `docs/reports/known-limitations.md`
**CONSTRAINTS:** A blocking finding is fixed, not deferred. Non-blocking findings are recorded honestly in known limitations rather than quietly dropped — an undocumented known issue becomes an unpleasant surprise for whoever inherits the project.
**ACCEPTANCE:** Every blocking finding is resolved and verified; non-blocking findings are in the backlog with owners; known limitations is honest and complete; all suites pass.
**STOP IF:** A blocking finding cannot be resolved — escalate rather than reclassifying it as non-blocking.
**COMMIT:** `fix(qa): remediate blocking review findings`

---

### B140 — Production readiness checklist
`PHASE: 17 · TYPE: Gate · SIZE: M · DEPS: B139 · PARALLEL: no`

**OBJECTIVE:** Determine, against explicit criteria, whether this system should carry real student orders and real money.

**TASK:** Complete and sign off the checklist:

**Product** — all in-scope requirements implemented; no blocking open question unresolved; **OQ-1 resolved and every package price flipped from `draft` to `confirmed`**; OQ-4 (admin bootstrap) and OQ-6 (real QRIS) resolved.

**UX** — all core flows complete; loading, error, and empty states implemented on every screen; all copy reviewed; no unkept promises.

**Design** — visual fidelity verified against all five references; every divergence justified; admin consistent with student.

**Backend** — every mutation runs server-side; reservation concurrency verified by the full suite at full repetition; lazy expiry proven independent of the cron.

**Security** — rules audited; admin authentication and RBAC verified; Storage access verified private; every threat has a failed attack attempt on record; no secret in the bundle or history.

**Data** — seed reconciled with a committed report showing 96 accepted; packages configured with confirmed prices; universities configured; QRIS configured and scan-verified on a real device.

**Testing** — unit, integration, concurrency, E2E (all twelve scenarios), accessibility, visual, and failure-mode suites all green; no unassigned flaky test.

**Operations** — deployment tested; rollback rehearsed per artefact; environment variables documented; cleanup scheduled and observed running; backups verified by an actual restore; monitoring and alerting live with every alert linked to a runbook procedure.

**Documentation** — README, PRD, DESIGN, AGENTS, ARCHITECTURE, DATA_MODEL, API_SPEC, SECURITY, TEST_PLAN, DEPLOYMENT, OPERATIONS, RUNBOOK, all ten ADRs, and the decision register — all present and current.

**CREATE:** `docs/reports/production-readiness.md`
**CONSTRAINTS:** Every item is verified, not asserted; each carries the evidence (a report link, a test run, a log entry). An unmet item is recorded as unmet — a checklist that always passes is decoration.
**ACCEPTANCE:** Every item is checked with evidence, or explicitly recorded as unmet with its risk and owner; the sign-off states plainly whether the system is ready.
**STOP IF:** Any Security or Backend item is unmet. Those two sections are not negotiable — the entire reason this system exists is to stop the same number being sold twice, and to handle student PII and payment evidence responsibly.
**COMMIT:** `docs(release): complete production readiness checklist and sign-off`
