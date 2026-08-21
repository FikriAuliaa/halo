 # PART D — CLAUDE CODE BLOCKS · Phases 6–9 (B061–B092)

> Prepend **SP-1** (see `01_BLOCKS_PHASE_0-2.md`) to every block.

---

# PHASE 6 — RESERVATION ENGINE

This is the highest-risk phase in the project. Every block here is deliberately small, and the concurrency suite (B066) is the gate that everything downstream depends on.

### B061 — Session identity
`PHASE: 6 · TYPE: Backend · SIZE: M · DEPS: B060 · PARALLEL: no`

**OBJECTIVE:** Give each anonymous student a server-controlled identity that the client cannot forge.

**CONTEXT:** Master prompt §9 forbids trusting client-side session IDs. The session is what ties a reservation to a browser, so a forgeable session ID would let one student steal another's reservation.

**TASK:** Implement session creation and resolution. On first contact with the ordering flow, mint a 32-byte CSPRNG session ID and set it in an `httpOnly`, `Secure`, `SameSite=Lax` cookie with a lifetime slightly longer than the reservation TTL. Provide `getOrCreateSession()` and `requireSession()` for use inside the operation framework. Store a `sessions/{sessionId}` document holding creation time, last-seen time, and the currently held reservation, if any.

**CREATE:** `src/server/session/session.ts`, `src/server/session/session-repository.ts`
**CONSTRAINTS:** The client never reads, sets, or transmits the session ID in a body or header — it travels only as an `httpOnly` cookie. `SameSite=Lax` (not `None`) because no cross-site context exists. The session document is the record of a session's single active reservation, enforcing assumption A5.
**DO NOT:** derive session identity from IP, user agent, or any fingerprint; shared campus NAT would collide students onto one identity.

**ACCEPTANCE:** A fresh request receives a cookie; the same browser resolves to the same session across requests; a tampered cookie value resolves to no session rather than to someone else's; the cookie is unreadable from JavaScript.
**TESTING:** Integration tests for creation, resolution, tampering, expiry, and concurrent requests from the same session.
**COMMIT:** `feat(session): add server-controlled anonymous session identity`

---

### B062 — Reservation domain model and reference minting
`PHASE: 6 · TYPE: Domain · SIZE: M · DEPS: B061 · PARALLEL: no`

**OBJECTIVE:** Define what a reservation *is*, and mint the order reference and tracking secret at the right moment.

**CONTEXT:** The payment screen displays `Kode Pemesanan HALO-ABC123XYZ` with a copy button, **before submission** (contradiction C7). The reference and tracking token are therefore minted at reservation, not at order creation. Getting this backwards forces a visible redesign later.

**TASK:** Define the `Reservation` type (number, session ID, `reserved_at`, `reserved_until`, `order_ref`, `tracking_token_hash`, reservation ID). Implement `mintOrderRef()` (Crockford base32, ambiguous characters excluded), `mintTrackingToken()` returning `{ token, hash }` where only the hash is ever persisted, and `computeReservedUntil(now, ttlMinutes)`. Implement `isExpired(reservation, now)` as the single expiry predicate.

**CREATE:** `src/domain/reservation.ts`
**CONSTRAINTS:** All randomness from `crypto.randomBytes`. The plaintext token is returned to the caller exactly once and is never written anywhere — not to Firestore, not to a log, not to an analytics event. Hashing is SHA-256 with the raw token bytes.
**ACCEPTANCE:** References match the documented pattern and show no collisions across 100,000 generations; the token plaintext appears in no persisted structure; `isExpired` is boundary-correct at exactly `reserved_until`.
**TESTING:** Unit tests for format, collision resistance, hash stability, and expiry boundaries including a one-millisecond margin either side.
**COMMIT:** `feat(domain): add reservation model with reference and token minting`

---

### B063 — Atomic `reserveNumber` operation
`PHASE: 6 · TYPE: Backend · SIZE: L · DEPS: B062, B059 · PARALLEL: no`

**OBJECTIVE:** Implement the operation the entire anti-double-booking guarantee rests on.

**CONTEXT:** Two students tapping the same number within milliseconds must produce exactly one reservation. Nothing about the client may be trusted.

**TASK:** Implement `reserveNumber(numberId)` as a Firestore transaction:
1. Resolve the session server-side; reject if the session already holds a live reservation on a different number (per A5).
2. Inside the transaction, read `numbers/{numberId}` and take `Timestamp.now()` server-side.
3. Compute effective status via `getEffectiveStatus` — a stored `reserved` with a passed `reserved_until` is treated as available.
4. If effective status is not available, abort with `NUMBER_UNAVAILABLE`.
5. Otherwise write `status: 'reserved'`, `reserved_at`, `reserved_until`, `session_id`, `reservation_id`, `order_ref`, `tracking_token_hash`, and `updated_at` — all in the same transaction.
6. Update the session document to point at the reservation, in the same transaction.
7. Return the number, `reserved_until` as an absolute ISO timestamp, `order_ref`, and the plaintext tracking token.

Expose it as `POST /api/reservations`, rate-limited and idempotency-keyed.

**CREATE:** `src/server/operations/reserve-number.ts`, `src/app/api/reservations/route.ts`
**CONSTRAINTS:** Every guard is evaluated **inside** the transaction. No read-then-write outside a transaction. `reserved_until` is derived from server time only. Re-reserving a number the session already holds is idempotent and extends nothing — it returns the existing reservation unchanged, so a double-tap cannot silently buy the student more time.
**DO NOT:** trust any client-supplied timestamp, session ID, or availability flag.

**ACCEPTANCE:**
1. A valid request on an available number succeeds and returns absolute server time.
2. A request on a `reserved` (live), `pending`, `sold`, or `sold_offline` number fails with `NUMBER_UNAVAILABLE`.
3. A request on an expired reservation succeeds and overwrites it.
4. A session holding a live reservation on another number is refused.
5. A repeat request for the same number from the same session returns the existing reservation without extending it.

**TESTING:** Emulator integration tests for each acceptance criterion. Concurrency is covered separately in B066.
**DOCS:** Update `API_SPEC.md` if the contract drifted.
**STOP IF:** Any guard cannot be evaluated inside the transaction — stop and re-plan rather than shipping a check-then-act race.
**COMMIT:** `feat(reservations): add atomic number reservation transaction`

---

### B064 — `validateReservation` operation
`PHASE: 6 · TYPE: Backend · SIZE: M · DEPS: B063 · PARALLEL: no`

**TASK:** Implement `validateReservation()`: resolve the session, load its reservation, verify the number document still carries the same `reservation_id` and `session_id`, verify it has not expired against server time, and return status plus remaining seconds and the absolute `reserved_until`. Statuses: `valid`, `expired`, `not_found`, `taken_over`. Expose as `GET /api/reservations/current`. Every subsequent step in the ordering flow calls this before rendering.

**CREATE:** `src/server/operations/validate-reservation.ts`, `src/app/api/reservations/current/route.ts`
**CONSTRAINTS:** Read-only — it never extends or repairs anything. `taken_over` (the number now belongs to a different reservation) is distinguished from `expired` because the student-facing message differs meaningfully.
**ACCEPTANCE:** All four statuses are reachable and correctly distinguished; remaining time matches server truth; the operation performs no write.
**TESTING:** Emulator tests for each status, including the takeover case constructed by expiring and re-reserving.
**COMMIT:** `feat(reservations): add reservation validation operation`

---

### B065 — `releaseReservation` operation
`PHASE: 6 · TYPE: Backend · SIZE: S · DEPS: B064 · PARALLEL: no`

**TASK:** Implement `releaseReservation()`: in a transaction, verify the session owns the reservation, reset the number to `available`, clear the reservation fields, and clear the session's held reservation. Expose as `DELETE /api/reservations/current`. Used when a student explicitly goes back to pick a different number.

**CREATE:** `src/server/operations/release-reservation.ts`
**CONSTRAINTS:** Only the owning session may release, and only from `reserved`. Releasing a `pending` number is refused — that path is admin rejection, not student action. Releasing a non-existent reservation succeeds silently (idempotent).
**ACCEPTANCE:** Owner releases successfully; a non-owner is refused; `pending` is refused; double release is safe; the number is immediately reservable by another session afterwards.
**TESTING:** Emulator tests per case.
**COMMIT:** `feat(reservations): add reservation release operation`

---

### B066 — Reservation concurrency test suite
`PHASE: 6 · TYPE: Testing · SIZE: L · DEPS: B065 · PARALLEL: no`

**OBJECTIVE:** Prove the core invariant by experiment. This suite is the reason to trust the system.

**CONTEXT:** Reasoning about a transaction is not evidence that it holds. Only genuinely parallel requests against a real Firestore emulator produce evidence.

**TASK:** Build an emulator-backed suite firing real parallel requests:
1. **Simultaneous reservation** — 20 sessions, one number, in parallel. Exactly one succeeds; 19 receive `NUMBER_UNAVAILABLE`.
2. **Staggered by milliseconds** — same, with 1–50 ms jitter. Same assertion.
3. **Race at the expiry boundary** — a reservation expiring at T; one request at T−10 ms, one at T+10 ms. Never two live owners.
4. **Expiry during form completion** — reserve, advance the clock past TTL, attempt submission; refused.
5. **Duplicate submission from one browser** — two identical submissions in parallel; exactly one order is created.
6. **Admin marks offline during a reservation attempt** — the two operations race; the final state is legal and only one wins.
7. **Admin rejects while the student polls tracking** — no inconsistent intermediate state is observable.
8. **Retry of a failed reservation** — a retried request after a transient failure produces one reservation, not two.
9. **Duplicate API call with the same idempotency key** — one execution, two identical responses.
10. **Refresh during a reservation** — the reservation survives; remaining time is continuous, not reset.
11. **Tab duplication** — two tabs, one session; both see the same reservation and cannot double-book.
12. **Janitor racing an active reservation** — cleanup running concurrently never releases a live reservation.

After each test, assert the global invariant across the whole collection: no number is referenced by more than one live reservation or non-rejected order.

**CREATE:** `tests/concurrency/reservation-concurrency.test.ts`, `tests/helpers/parallel.ts`, `tests/helpers/invariants.ts`
**CONSTRAINTS:** Requests must be genuinely concurrent (`Promise.all` over pre-built requests, not a sequential loop). Run each scenario at least 20 times — a race that fails one time in fifty is still a race. The invariant checker is shared and reused by every test.
**DO NOT:** weaken an assertion to make a test pass. A flake here is a real bug until proven otherwise.

**ACCEPTANCE:** All twelve scenarios pass at 20+ repetitions; the invariant holds after every scenario; the suite runs in CI within a sane duration.
**VERIFY:** Deliberately break the transaction guard (comment out the status check), confirm the suite fails loudly, then restore it. A suite that cannot detect the bug it exists to catch is worthless.
**DOCS:** Record the results summary in `TEST_PLAN.md`.
**STOP IF:** Any scenario fails after the guard is restored — do not proceed to Phase 7.
**COMMIT:** `test(reservations): add concurrency and invariant test suite`

---

### B067 — Scheduled reservation cleanup function
`PHASE: 6 · TYPE: Backend · SIZE: M · DEPS: B066 · PARALLEL: no`

**TASK:** Implement a 2nd-gen Cloud Function on a 2-minute Cloud Scheduler trigger. It queries numbers where `status == 'reserved'` and `reserved_until <= now`, and for each runs a transaction that re-verifies expiry before resetting to `available` and clearing reservation fields. It processes in bounded batches, logs a structured summary (scanned, released, skipped, errors, duration), and continues past individual failures.

**CREATE:** `functions/src/cleanup-expired-reservations.ts`, `functions/src/index.ts`, `functions/package.json`, `functions/tsconfig.json`
**CONSTRAINTS:** Each release re-checks expiry inside its own transaction — the query result is already stale by the time the write runs. The function is **not** load-bearing: correctness comes from lazy expiry (B057, B063), and this is hygiene. Cap work per invocation and let the next run continue rather than risking a timeout mid-batch. Idempotent by construction.
**DO NOT:** touch `pending`, `sold`, or `sold_offline` numbers under any circumstance.

**ACCEPTANCE:** Expired reservations are released; live ones are untouched; a reservation expiring between query and write is handled safely; the run summary is logged; individual failures do not abort the batch.
**TESTING:** Emulator tests with mixed fixtures, plus the boundary case where a reservation expires between query and transaction.
**COMMIT:** `feat(functions): add scheduled expired reservation cleanup`

---

### B068 — Manual and emergency cleanup operations
`PHASE: 6 · TYPE: Backend · SIZE: S · DEPS: B067 · PARALLEL: no`

**TASK:** Implement `adminRunCleanup` (invokes the same logic on demand, returning the summary) and `adminForceReleaseReservation` (releases a specific number's reservation, requiring a written reason, fully audited). Both are `ADMIN_TELKOMSEL` only.

**CREATE:** `src/server/operations/admin/cleanup.ts`, `src/server/operations/admin/force-release.ts`
**CONSTRAINTS:** Force-release works on a **live** reservation and is therefore genuinely destructive to a student mid-order; it requires a reason, writes an audit record, and is restricted to the higher role. Cleanup logic is shared with B067 rather than duplicated.
**ACCEPTANCE:** Manual cleanup matches scheduled behaviour; force-release requires a reason and is audited; `ADMIN_KAMPUS` is refused.
**TESTING:** Emulator tests including role enforcement and audit completeness.
**DOCS:** Add both to `RUNBOOK.md` with when-to-use guidance.
**COMMIT:** `feat(admin): add manual and emergency reservation cleanup`

---

### B069 — Reservation observability
`PHASE: 6 · TYPE: Backend · SIZE: S · DEPS: B068 · PARALLEL: yes`

**TASK:** Emit structured events for `reservation_created`, `reservation_failed` (with reason), `reservation_expired`, `reservation_released`, `reservation_taken_over`, and `cleanup_run`. Each carries the correlation ID and non-PII context (number ID is business data, not PII; session ID is hashed).

**CREATE:** `src/server/observability/events.ts`
**CONSTRAINTS:** No phone number appears in an analytics event where an internal ID suffices. Events are fire-and-forget and never fail the request.
**ACCEPTANCE:** All six events emit at the right points; no PII present; an event sink failure does not break the operation.
**TESTING:** Unit tests asserting emission and payload shape.
**COMMIT:** `feat(observability): add reservation lifecycle events`

---

### B070 — Phase 6 verification gate
`PHASE: 6 · TYPE: Gate · SIZE: M · DEPS: B061–B069 · PARALLEL: no`

**TASK:** Run every suite including concurrency at full repetition. Re-verify the invariant. Confirm no reservation logic exists outside `src/domain/` and `src/server/operations/`. Confirm `ARCHITECTURE.md` and ADR-004 match the implementation.

**ACCEPTANCE:** All suites green; invariant holds; documentation matches; no reservation logic leaked into components or repositories.
**STOP IF:** Anything fails. This gate protects every downstream phase.
**COMMIT:** `chore(reservations): close phase 6 reservation engine gate`

---

# PHASE 7 — STUDENT ORDERING FLOW

### B071 — Ordering flow routing and state machine
`PHASE: 7 · TYPE: Frontend · SIZE: M · DEPS: B070 · PARALLEL: no`

**TASK:** Create routes `/` (number selection), `/paket`, `/data`, `/bayar`, `/konfirmasi`, `/lacak`. Implement a flow guard that, on entry to any step after the first, calls `validateReservation` server-side and redirects to the number screen with an explanatory message when the reservation is expired, missing, or taken over. Define the client flow state (selected number, selected package, form draft) with an explicit rule that reservation truth always comes from the server, never from this state.

**CREATE:** `src/app/(student)/layout.tsx`, `src/app/(student)/*/page.tsx`, `src/lib/flow-state.ts`, `src/server/guards/require-reservation.ts`
**CONSTRAINTS:** The guard runs on the server before render, so an expired student never sees a form they cannot submit. Client flow state is convenience only. Deep-linking to a later step without a reservation redirects gracefully rather than erroring.
**ACCEPTANCE:** Each step guards correctly; expiry redirects with a clear message; deep links behave; back navigation does not corrupt state.
**TESTING:** E2E tests for deep-link, expiry redirect, and back navigation.
**COMMIT:** `feat(student): add ordering flow routing and reservation guards`

---

### B072 — Number selection page
`PHASE: 7 · TYPE: Frontend · SIZE: L · DEPS: B071 · PARALLEL: no`

**TASK:** Build the number selection screen against the `pilih_nomor_refresh_animation` reference: header lockup, "Pilih Nomor Halo Keinginanmu", a subtitle rewritten to state the *actual* guarantee (the reference's open-ended promise is replaced per contradiction C6), the "Refresh Nomor Halo" pill with its rotation animation, the card list with formatted numbers, and the sticky "Lanjut Pilih Paket" CTA.

**CREATE:** `src/app/(student)/page.tsx`, `src/components/student/number-list.tsx`, `src/components/student/number-card.tsx`, `src/components/student/refresh-button.tsx`
**CONSTRAINTS:** Card states derive from `DESIGN.md` — the reference renders every card as "Terkunci" and never shows an available card (C15). Cards are radio inputs in a labelled group, not clickable divs. The CTA is disabled until a selection exists, with the reason exposed accessibly. Refresh animation respects reduced motion.
**ACCEPTANCE:** Matches the reference at 390 px; available, selected, and locked states are all distinguishable without colour alone; keyboard navigation moves through the group correctly; refresh fetches a new sample.
**VERIFY:** Side-by-side against `screen.png`.
**TESTING:** Component tests for selection and keyboard; E2E for refresh.
**COMMIT:** `feat(student): build number selection screen`

---

### B073 — Number selection states
`PHASE: 7 · TYPE: Frontend · SIZE: M · DEPS: B072 · PARALLEL: no`

**TASK:** Implement every non-happy state: initial loading (skeleton grid), empty pool, no search results, network error with retry, refresh-in-flight, reservation-failure (the chosen number was taken between render and tap), and the post-expiry return state with an explanatory banner. Add the digit-suffix search input (implementation decision from C14) with debounce.

**MODIFY:** number selection page and list components
**CONSTRAINTS:** The reservation-failure case must feel like a normal outcome, not an error — the number is quietly marked unavailable, a brief toast explains, and the list refreshes. This is a race students will genuinely hit, and treating it as a crash would be wrong. Search debounce is 300 ms and cancels in-flight requests.
**ACCEPTANCE:** All seven states reachable and rendered; race feels graceful; search debounces and cancels; empty-pool state offers something useful.
**TESTING:** Component tests per state; E2E for the reservation race using a forced conflict.
**COMMIT:** `feat(student): implement number selection loading, empty and error states`

---

### B074 — Reservation integration and timer wiring
`PHASE: 7 · TYPE: Frontend · SIZE: M · DEPS: B073, B038 · PARALLEL: no`

**TASK:** Wire selection to `reserveNumber`. On success, store the absolute `reserved_until` and the clock offset, mount `ReservationTimer` beneath the header on every subsequent step, and navigate to packages. On `onExpire`, call `validateReservation` — the server, not the timer, decides — and on confirmation route back with an explanation. Revalidate on tab focus and on network reconnect.

**MODIFY:** flow layout, number page; **CREATE:** `src/hooks/use-reservation.ts`
**CONSTRAINTS:** The timer never triggers a mutation. Clock offset is measured once per fetch from a server-supplied timestamp so a phone with a wrong clock still counts down correctly. Focus revalidation is throttled to avoid a request storm on rapid tab switching.
**ACCEPTANCE:** Timer appears on all four steps; expiry triggers server revalidation, not client-side release; a device clock skewed by an hour still shows correct remaining time; refresh preserves continuity.
**TESTING:** E2E covering refresh mid-reservation, expiry while idle, and skewed clock.
**COMMIT:** `feat(student): wire reservation lifecycle and countdown timer`

---

### B075 — Package configuration and query
`PHASE: 7 · TYPE: Backend · SIZE: M · DEPS: B070 · PARALLEL: yes`

**OBJECTIVE:** Make packages fully configuration-driven, with the design's prices seeded as explicit drafts.

**CONTEXT:** The spec lists prices as TBD; the design shows Rp 100/120/150/200/300 ribu with quota, roaming, minutes, and SMS (contradictions C2, C3). Those values come from the design, so they are seeded as `draft` — never invented, never hardcoded.

**TASK:** Extend `config/packages` to hold, per package: `id`, `label`, `price`, `price_status` (`draft` | `confirmed`), `internet_gb`, `roaming_gb`, `voice_minutes`, `sms_count`, `is_recommended`, `is_active`, `sort_order`. Seed all five from the design values with `price_status: 'draft'`. Implement `getPackages()` returning only active packages in sort order.

**CREATE:** `scripts/seed-config.ts`, `src/server/operations/get-packages.ts`, `src/app/api/packages/route.ts`
**CONSTRAINTS:** No price, quota, or label appears in any component. Outside production, a draft price renders with a visible "harga sementara" marker; in production a draft price is a readiness-checklist failure (B131), not a silent shipment.
**ACCEPTANCE:** Five packages seeded with the design's values; `is_recommended` true only for `pkg_160gb` (matching the "Rekomendasi" badge); re-running the seed is idempotent; no hardcoded values survive a grep.
**TESTING:** Integration tests for seeding, idempotency, and active filtering.
**DOCS:** Note the draft-price decision in `PROJECT_DECISIONS.md`.
**COMMIT:** `feat(config): add configuration-driven package catalogue`

---

### B076 — Package selection screen
`PHASE: 7 · TYPE: Frontend · SIZE: L · DEPS: B075, B074 · PARALLEL: no`

**TASK:** Build the package screen against `pilihan_paket_halo_horizontal_scroll_layout`: heading "Koneksi Makin Puas dengan Paket Halo+", the horizontal snap scroller (`w-[85vw]`, `max-w-[380px]`, `snap-x snap-mandatory`, `snap-center`), gradient cards with the price treatment (`Rp` / figure / `ribu`), the quota rows with `DataDisplay` figures, the divider lines, the "Rekomendasi" badge on the 160 GB card, the informational "Pilih 1 Extra Benefit" chip, and the sticky "Lanjut Isi Data Diri" CTA.

**CREATE:** `src/app/(student)/paket/page.tsx`, `src/components/student/package-scroller.tsx`, `src/components/student/package-card.tsx`
**CONSTRAINTS:** The "Extra Benefit" chip is **non-interactive** (contradiction C4, assumption A4) — it looks like part of the card because the reference shows it, but it selects nothing, since no benefit catalogue exists. Do not build a selection mechanism with no domain behind it. Cards are radios in a labelled group; keyboard arrow navigation scrolls the selected card into view. At ≥1024 px the scroller becomes a grid.
**ACCEPTANCE:** Matches the reference at 390 px including snap behaviour; keyboard selection scrolls into view; selection state uses the orange glow plus a second signifier; grid layout at desktop; prices render from config.
**VERIFY:** Compare against `screen.png`; test snap on a real touch viewport.
**TESTING:** Component tests for selection and keyboard; E2E for snap scrolling and desktop grid.
**COMMIT:** `feat(student): build package selection screen`

---

### B077 — Package screen states
`PHASE: 7 · TYPE: Frontend · SIZE: S · DEPS: B076 · PARALLEL: no`

**TASK:** Implement loading skeleton matching the scroller, config-load failure with retry, inactive-package handling (hidden, not greyed), the preserved selected-number summary, and the visible timer. Handle the case where a previously selected package became inactive between steps.

**MODIFY:** package page
**CONSTRAINTS:** If the stored selection is no longer active, clear it and tell the student plainly rather than failing at submission.
**ACCEPTANCE:** All states render; the stale-selection case is handled at the package step, not at submission.
**TESTING:** Component tests per state.
**COMMIT:** `feat(student): implement package screen loading and error states`

---

### B078 — University configuration and personal data form
`PHASE: 7 · TYPE: Frontend · SIZE: L · DEPS: B077 · PARALLEL: no`

**TASK:** Seed `config/universities` with an ordered, admin-editable list (OQ-2 default: a small Surabaya-area list, since the reference shows "Universitas Surabaya"). Build the `data_diri_updated_theme` screen: heading "Lengkapi Data Diri", the guidance subtitle, Nama Lengkap, Universitas (searchable select), Nomor WhatsApp with the `+62` prefix affordance, Email, and the "Lanjut ke Pembayaran" CTA.

**CREATE:** `src/app/(student)/data/page.tsx`, `src/components/student/order-form.tsx`, `src/server/operations/get-universities.ts`
**CONSTRAINTS:** Validation uses the shared Zod schema (B049), so client and server messages are identical. University is validated against the allowlist on the server — a crafted request cannot inject an arbitrary institution. Phone normalisation uses B055. Errors are announced on blur, not on every keystroke.
**ACCEPTANCE:** Matches the reference; all four fields validate correctly; university select is searchable and keyboard-usable; the `+62` prefix does not corrupt pasted `08…` input; server rejects an off-list university.
**TESTING:** Component tests per field; integration test for the off-list injection attempt.
**COMMIT:** `feat(student): build personal data form with university configuration`

---

### B079 — Form draft persistence and recovery
`PHASE: 7 · TYPE: Frontend · SIZE: M · DEPS: B078 · PARALLEL: no`

**TASK:** Persist the form draft so a refresh, an accidental back navigation, or a brief connectivity loss does not destroy typed input. Restore on return, clear on successful submission, and clear when the reservation ends.

**CREATE:** `src/hooks/use-form-draft.ts`
**CONSTRAINTS:** Draft storage holds **form input only** — never reservation state, never the tracking token, never anything the server must be authoritative about (`AGENTS.md` prohibits `localStorage` as a source of truth). Namespace the draft by reservation ID so a new reservation never inherits a stale draft. Clear on expiry so a student's PII does not linger in browser storage after the flow ends.
**ACCEPTANCE:** Refresh restores input; a new reservation starts clean; submission clears the draft; expiry clears the draft; no reservation state is stored.
**TESTING:** Component tests for save, restore, namespace isolation, and clearing.
**COMMIT:** `feat(student): add form draft persistence and recovery`

---

### B080 — Phase 7 verification gate
`PHASE: 7 · TYPE: Gate · SIZE: M · DEPS: B071–B079 · PARALLEL: no`

**TASK:** Walk the flow end to end on mobile and desktop viewports. Run axe on each screen. Compare each screen against its reference screenshot. Run all suites. Verify the timer is visible and correct on every step.

**ACCEPTANCE:** Flow completes to the payment step; zero serious or critical axe violations; visual match confirmed; all suites pass.
**STOP IF:** Any screen materially diverges from its reference, or the timer misbehaves on any step.
**COMMIT:** `chore(student): close phase 7 ordering flow gate`

---

# PHASE 8 — PAYMENT

### B081 — Payment configuration and QRIS display
`PHASE: 8 · TYPE: Full-stack · SIZE: M · DEPS: B080 · PARALLEL: no`

**TASK:** Implement `config/payment` (`qr_image_url`, `payment_label`, `instructions`, `updated_at`, `updated_by`) with a development placeholder (OQ-6). Build the QRIS section of the payment screen: the QR panel, the instruction copy, and the "Simpan QR" download control from the reference.

**CREATE:** `src/app/(student)/bayar/page.tsx`, `src/components/student/qris-panel.tsx`, `src/server/operations/get-payment-config.ts`
**CONSTRAINTS:** The QR renders at a size that scans reliably from another device's camera — a QR shrunk to fit a layout is a broken payment flow. Never below 200 px, with adequate quiet-zone padding, and it does not scale down on small screens. Download saves the original asset, not a canvas re-render. Missing config is an explicit, actionable error state, not a broken image.
**ACCEPTANCE:** QR scans successfully from a real device at 390 px width; download works on iOS Safari and Android Chrome; missing config produces a clear state.
**VERIFY:** Scan the rendered QR with a phone.
**TESTING:** Component tests for render and missing config; manual scan check recorded in the QA checklist.
**COMMIT:** `feat(payment): add payment configuration and QRIS display`

---

### B082 — Payment summary and total
`PHASE: 8 · TYPE: Frontend · SIZE: S · DEPS: B081 · PARALLEL: no`

**TASK:** Build the summary block from the reference: "Nomor Pilihan", "Paket" with label and price, and "Kode Pemesanan" with a copy-to-clipboard control. Compute the total from config.

**MODIFY:** payment page; **CREATE:** `src/components/student/order-summary.tsx`, `src/components/ui/copy-button.tsx`
**CONSTRAINTS:** Price comes from config, formatted with `Intl` in `id-ID`. `order_ref` comes from the reservation (B062) — this is where the design's pre-submission `Kode Pemesanan` becomes real. Copy has a visible and announced confirmation and a fallback for browsers without the clipboard API.
**ACCEPTANCE:** Summary matches the reference; total is correct; copy works with a fallback path; the reference is the one minted at reservation.
**TESTING:** Component tests for formatting and copy including the fallback.
**COMMIT:** `feat(payment): add order summary with copyable reference`

---

### B083 — Payment proof upload endpoint
`PHASE: 8 · TYPE: Security · SIZE: L · DEPS: B082 · PARALLEL: no`

**OBJECTIVE:** Accept an untrusted image from an unauthenticated user without accepting the risk that comes with it.

**CONTEXT:** Students have no credentials, so they cannot be given Storage write access. The upload passes through the server, which is also where it can be made safe.

**TASK:** Implement the upload path inside `submitOrder`'s handler: enforce the size cap before buffering the whole body; sniff magic bytes to confirm JPEG, PNG, or WEBP; reject any mismatch between sniffed type, declared MIME, and extension; **decode and re-encode with `sharp`**, stripping all metadata and capping dimensions; write to `proofs/{orderId}/{uuid}.{ext}` in the private bucket with no public access; store the object path (never a URL) on the order.

**CREATE:** `src/server/storage/upload-proof.ts`, `src/server/storage/validate-image.ts`
**CONSTRAINTS:** Extension checking alone is theatre; magic-byte sniffing alone still admits polyglot files that are simultaneously a valid image and a valid script. Re-encoding destroys both the polyglot payload and the EXIF block, which routinely carries GPS coordinates the student never meant to share. Enforce the size cap by streaming, not by loading first — otherwise a 500 MB body is a denial-of-service before validation ever runs. Set a decode timeout; a decompression-bomb image must fail rather than exhaust memory. No object is ever publicly readable.
**DO NOT:** trust the declared MIME type or the filename for anything security-relevant.

**ACCEPTANCE:**
1. Valid JPEG, PNG, and WEBP uploads succeed.
2. A renamed `.txt`, an SVG, a PDF, and a polyglot JPEG/HTML file are all rejected.
3. A 6 MB file is rejected before full buffering.
4. A decompression bomb fails safely within the timeout.
5. EXIF including GPS is absent from the stored object.
6. The stored object is not publicly readable.

**TESTING:** Integration tests with real fixture files for every case, including a crafted polyglot and a bomb.
**DOCS:** Update `SECURITY.md` with the realised control set.
**STOP IF:** `sharp` cannot be installed in the target runtime — re-plan the validation strategy rather than downgrading to sniffing alone.
**COMMIT:** `security(storage): add validated payment proof upload pipeline`

---

### B084 — Proof upload client integration
`PHASE: 8 · TYPE: Frontend · SIZE: M · DEPS: B083, B041 · PARALLEL: no`

**TASK:** Wire `FileUploader` to the endpoint with real progress, cancellation via `AbortController`, retry with backoff, preview, and remove/replace. Handle each server rejection with a specific, non-technical Indonesian message.

**MODIFY:** payment page
**CONSTRAINTS:** Client-side type and size checks are UX only and are explicitly commented as such — the server check is the control. Cancellation genuinely aborts the request rather than hiding the UI. Retry does not duplicate an upload that actually succeeded.
**ACCEPTANCE:** Progress is real, not simulated; cancel aborts; retry after a network failure succeeds without duplication; each rejection reason has a distinct message; a large photo from a real phone camera uploads on a slow connection.
**TESTING:** Component tests with mocked upload; E2E with a throttled network profile.
**COMMIT:** `feat(payment): integrate payment proof upload with progress and retry`

---

### B085 — `submitOrder` operation
`PHASE: 8 · TYPE: Backend · SIZE: L · DEPS: B084 · PARALLEL: no`

**TASK:** Implement `submitOrder`: validate the payload; re-validate the reservation server-side (rejecting `RESERVATION_EXPIRED` if it lapsed while the form was open); validate the package is active and the university is on the allowlist; upload and validate the proof; then in a single transaction create the `orders` document (with the `order_ref` and `tracking_token_hash` minted at reservation), move the number to `pending`, clear the reservation fields while retaining the session link, and record the idempotency result. Return the reference and a confirmation payload.

**CREATE:** `src/server/operations/submit-order.ts`, `src/app/api/orders/route.ts`
**CONSTRAINTS:** The transaction re-checks that the number is still `reserved` by this session — the state may have changed since validation. Uploading before the transaction means a failed transaction can orphan an object; record orphans for cleanup rather than leaving them untracked. Idempotency-keyed so a double-tap creates one order. `submitted_at` is server-generated. The number moves to `pending`, resolving the spec's internal contradiction (C11) per ADR-003.
**DO NOT:** accept a client-supplied price, status, timestamp, or order reference.

**ACCEPTANCE:** A valid submission creates one order and moves the number to `pending`; an expired reservation is refused with the proof cleaned up; duplicate submission creates exactly one order; an inactive package is refused; an off-list university is refused; a client-supplied price is ignored.
**TESTING:** Emulator integration tests per case; the concurrency case is covered in B066 scenario 5.
**COMMIT:** `feat(orders): add trusted order submission operation`

---

### B086 — Submission error recovery
`PHASE: 8 · TYPE: Frontend · SIZE: M · DEPS: B085 · PARALLEL: no`

**TASK:** Handle every submission failure: expired reservation (explain and return to number selection, preserving the package choice for convenience), network failure (retry without re-uploading if the proof already succeeded), server error (retry with the correlation ID surfaced for support), validation failure (focus the first invalid field), and package-became-inactive.

**MODIFY:** payment page
**CONSTRAINTS:** Never lose the student's typed data on a recoverable failure. The submit button locks during the request and shows progress. On expiry, be honest that the number is gone rather than implying a retry might work.
**ACCEPTANCE:** All five failures are handled distinctly; input survives every recoverable failure; double-submission is impossible; the correlation ID is available for support.
**TESTING:** E2E for each failure using request interception.
**COMMIT:** `feat(payment): implement submission error recovery`

---

### B087 — Phase 8 verification gate
`PHASE: 8 · TYPE: Gate · SIZE: M · DEPS: B081–B086 · PARALLEL: no`

**TASK:** Complete the full flow to a submitted order. Verify the stored proof is private, EXIF-free, and correctly named. Run axe on the payment screen. Compare against the reference. Run all suites including concurrency.

**ACCEPTANCE:** Order created; proof private and sanitised; no axe violations; visual match; all suites pass.
**VERIFY:** Attempt to fetch the stored object without credentials and confirm denial.
**STOP IF:** The proof is publicly reachable by any URL.
**COMMIT:** `chore(payment): close phase 8 payment gate`

---

# PHASE 9 — CONFIRMATION AND TRACKING

### B088 — Confirmation screen
`PHASE: 9 · TYPE: Frontend · SIZE: M · DEPS: B087 · PARALLEL: no`

**TASK:** Build the confirmation screen from `konfirmasi_pesanan_perfect_alignment`: the success icon, "Order Berhasil!", the detail card (Nomor Terpilih, Paket, Nama, Email), the info panel, and "Selesai". Then add what the reference omits (contradictions C8, C9): the order reference and tracking token with copy controls, a clear "shown only once — save it" warning, a direct link to the tracking page, the submission timestamp, the pending status, and next steps.

**CREATE:** `src/app/(student)/konfirmasi/page.tsx`, `src/components/student/confirmation-card.tsx`
**CONSTRAINTS:** The reference's copy promises an email or WhatsApp confirmation that the project does not build (spec §4 excludes notifications). **Rewrite it** to describe self-service tracking; do not ship a promise no code keeps. The tracking token is displayed exactly once and cannot be re-issued — say so plainly. Offer a combined copy action for reference-plus-token, since copying one and losing the other is the obvious failure.
**ACCEPTANCE:** Matches the reference where the reference is correct; reference and token are displayed with copy controls and the one-time warning; the copy makes no promise the system cannot keep; the tracking link works.
**TESTING:** Component tests for rendering and copy; E2E from submission through to tracking via the link.
**DOCS:** Record the copy change in `PROJECT_DECISIONS.md`.
**COMMIT:** `feat(student): build confirmation screen with tracking credentials`

---

### B089 — `getTrackingStatus` operation
`PHASE: 9 · TYPE: Backend · SIZE: M · DEPS: B088 · PARALLEL: no`

**TASK:** Implement tracking lookup: accept `order_ref` plus token, look up by reference, compare `sha256(token)` against the stored hash in **constant time**, and on match return a minimal projection — status, number, package label, submitted timestamp, and any admin note on rejection. On mismatch return the same generic not-found response as an unknown reference. Rate-limit aggressively per IP and per reference.

**CREATE:** `src/server/operations/get-tracking-status.ts`, `src/app/api/tracking/route.ts`
**CONSTRAINTS:** Constant-time comparison prevents timing-based token discovery. Identical responses and timing for wrong-token and unknown-reference prevent reference enumeration. The projection excludes the proof, the email, the phone, and every internal field — the student already knows their own details, and returning them creates an exposure with no benefit. This endpoint **fails closed** under rate-limiter failure, unlike the fairness limiters (B052).
**DO NOT:** accept a reference alone; do not accept email or WhatsApp as an alternative credential (contradiction C17).

**ACCEPTANCE:** A correct pair returns status; a wrong token and an unknown reference are indistinguishable in body and timing; the projection contains no PII beyond what the student supplied; rate limiting triggers and fails closed.
**TESTING:** Integration tests including a timing-comparison test over many samples and an enumeration attempt.
**COMMIT:** `feat(tracking): add secure order tracking lookup`

---

### B090 — Tracking page
`PHASE: 9 · TYPE: Frontend · SIZE: M · DEPS: B089 · PARALLEL: no`

**TASK:** Build `/lacak` with a manual entry form (reference + token) and support for a prefilled link from the confirmation screen. Render each status distinctly: `pending` ("sedang ditinjau"), `verified` ("selamat — nomor dikonfirmasi"), `rejected` (with the admin note and guidance on next steps). Include order details, submission time, and a refresh control.

**CREATE:** `src/app/(student)/lacak/page.tsx`, `src/components/student/tracking-form.tsx`, `src/components/student/tracking-status.tsx`
**CONSTRAINTS:** The prefilled link puts credentials in the URL, which is a real trade-off — it is accepted deliberately for usability, mitigated by the token being single-purpose, low-value, and revocable by admin action, and the page sets `Referrer-Policy: no-referrer` so the credentials are not leaked onward. Record this trade-off in ADR-005 rather than leaving it implicit. Manual entry is always available for students who prefer it.
**ACCEPTANCE:** All three statuses render distinctly; the prefilled link works; manual entry works; wrong credentials give an unhelpful-by-design message; `Referrer-Policy` is set.
**TESTING:** Component tests per status; E2E for both entry paths.
**COMMIT:** `feat(tracking): build student order tracking page`

---

### B091 — Tracking refresh and states
`PHASE: 9 · TYPE: Frontend · SIZE: S · DEPS: B090 · PARALLEL: no`

**TASK:** Implement manual refresh plus opt-in polling at a 30-second interval that pauses when the tab is hidden and stops on a terminal status. Add loading, network error, rate-limited (with `Retry-After` respected), and not-found states.

**MODIFY:** tracking page
**CONSTRAINTS:** Polling is bounded and stops on `verified` or `rejected` — indefinite polling on a terminal status is pure waste. Hidden-tab pausing prevents a forgotten tab from consuming the rate limit. `Retry-After` is honoured rather than ignored.
**ACCEPTANCE:** Polling pauses when hidden and stops on terminal status; rate-limit state shows a countdown; all states render.
**TESTING:** Component tests with mocked visibility and timers.
**COMMIT:** `feat(tracking): add bounded polling and tracking states`

---

### B092 — Phase 9 verification gate
`PHASE: 9 · TYPE: Gate · SIZE: S · DEPS: B088–B091 · PARALLEL: no`

**TASK:** Complete the student journey from number selection to tracking. Verify the token appears exactly once and never in a log or an analytics event. Run axe on both screens. Run all suites.

**ACCEPTANCE:** Journey completes; token never persisted or logged; no axe violations; all suites pass.
**VERIFY:** Grep the emulator logs and Firestore export for the plaintext token; it must be absent.
**STOP IF:** The plaintext token appears anywhere outside the HTTP response body.
**COMMIT:** `chore(tracking): close phase 9 confirmation and tracking gate`
