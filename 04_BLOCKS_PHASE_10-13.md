# PART D — CLAUDE CODE BLOCKS · Phases 10–13 (B093–B112)

> Prepend **SP-1** (see `01_BLOCKS_PHASE_0-2.md`) to every block.
>
> **Admin design rule:** the admin interface may be denser than the student interface, but it uses the same tokens, typography, colour semantics, radii, and interaction feedback. It must look like the same product, not a third-party admin template dropped into the project.

---

# PHASE 10 — ADMIN AUTHENTICATION

### B093 — Admin authentication model and bootstrap
`PHASE: 10 · TYPE: Security · SIZE: L · DEPS: B092 · PARALLEL: no`

**OBJECTIVE:** Establish real authentication and role-based authorization for administrators.

**CONTEXT:** The specification leaves admin access as TBD and floats access-by-URL (contradiction C18). ADR-002 rejects that outright: an unlisted URL is not an access control, it is a wish.

**TASK:** Configure Firebase Authentication with email/password for admins only. Implement custom claims carrying `role: 'ADMIN_KAMPUS' | 'ADMIN_TELKOMSEL'`. Implement server-side verification: an ID token is exchanged for a session cookie, and every admin request verifies that cookie and reads the role from the **verified token**, never from the request body or a client-supplied header. Write a bootstrap script that creates the first `ADMIN_TELKOMSEL` account and sets its claim, plus a role-assignment script for subsequent admins.

**CREATE:** `src/server/auth/admin-auth.ts`, `src/server/auth/session-cookie.ts`, `scripts/bootstrap-admin.ts`, `scripts/set-admin-role.ts`
**CONSTRAINTS:** Role always comes from the verified token. Session cookies are `httpOnly`, `Secure`, `SameSite=Strict` (admin pages have no legitimate cross-site entry point), with a lifetime of 8 hours. The bootstrap script refuses to run against production without an explicit confirmation flag and never accepts a password as a command-line argument, since arguments land in shell history and process listings — prompt for it instead. Claim changes require re-authentication to take effect, and this must be documented, because an admin whose role was just downgraded keeping their old privileges until logout is a real gap.
**DO NOT:** ship a hardcoded default admin credential. Not even in development — those escape.

**ACCEPTANCE:** Bootstrap creates a working `ADMIN_TELKOMSEL` account; the role is readable from the verified token server-side; a forged role in a request body is ignored; an expired session cookie is rejected; the production guard works.
**TESTING:** Integration tests for token verification, forged-role rejection, expiry, and role assignment.
**DOCS:** Document the full bootstrap sequence in `DEPLOYMENT.md` and `RUNBOOK.md` (OQ-4).
**STOP IF:** Custom claims cannot be set in the target environment — re-plan the authorization mechanism rather than falling back to a client-readable role.
**COMMIT:** `security(auth): add admin authentication with role-based claims`

---

### B094 — Admin login screen
`PHASE: 10 · TYPE: Frontend · SIZE: M · DEPS: B093 · PARALLEL: no`

**TASK:** Build `/admin/login` in the Crimson Pulse language: email, password with a visibility toggle, submit, and error handling. On success, exchange the ID token for a session cookie server-side and redirect to the dashboard or the originally requested URL.

**CREATE:** `src/app/(admin)/admin/login/page.tsx`, `src/components/admin/login-form.tsx`, `src/app/api/admin/session/route.ts`
**CONSTRAINTS:** The error message for a wrong password and for a non-existent account is identical, so the form cannot be used to enumerate admin accounts. Rate-limit by IP and by email. Never log the password, and never include it in an error object that might be serialised. The redirect target is validated as a relative path within the admin area, or an open redirect becomes a phishing vector.
**ACCEPTANCE:** Valid credentials establish a session; wrong credentials and unknown accounts are indistinguishable; rate limiting triggers; the redirect target cannot be pointed off-site; the form is fully keyboard- and screen-reader-usable.
**TESTING:** Component tests for validation and error handling; integration tests for the session exchange and the open-redirect attempt.
**COMMIT:** `feat(admin): build admin login screen`

---

### B095 — Admin route protection
`PHASE: 10 · TYPE: Security · SIZE: M · DEPS: B094 · PARALLEL: no`

**TASK:** Protect every `/admin/*` route and every `/api/admin/*` handler. Implement a server-side guard that verifies the session cookie before render and redirects unauthenticated users to login with the intended destination preserved. Implement `requireAdmin(role?)` inside the operation framework for API handlers. Add middleware for the cheap, coarse check.

**CREATE:** `src/middleware.ts`, `src/server/guards/require-admin.ts`
**CONSTRAINTS:** Middleware is an optimisation, not the control — it may only perform a coarse cookie-presence check. **Every** admin route handler independently verifies the token, because a middleware misconfiguration or a route pattern that fails to match must not silently open an endpoint. Defence in depth here is cheap; the failure mode is not.
**ACCEPTANCE:** Unauthenticated access to any admin page redirects to login; unauthenticated API calls return 401; an authenticated non-admin (no claim) is refused; removing middleware entirely does not expose any endpoint.
**VERIFY:** Enumerate every route under `src/app/(admin)` and `src/app/api/admin` and confirm each is covered; temporarily disable middleware and re-run the auth tests — they must still pass.
**TESTING:** Integration tests hitting every admin endpoint unauthenticated and as each role.
**STOP IF:** Any admin endpoint is reachable without a verified token.
**COMMIT:** `security(admin): enforce server-side admin route protection`

---

### B096 — RBAC, unauthorized states, and logout
`PHASE: 10 · TYPE: Security · SIZE: M · DEPS: B095 · PARALLEL: no`

**TASK:** Define the permission matrix mapping every admin operation to its required role, and enforce it server-side. Implement client UX guards that hide actions the current role cannot perform — while never relying on hiding as the control. Build the unauthorized state (403 page explaining the role requirement without leaking what exists). Implement logout that revokes the session cookie server-side, not merely clears it client-side.

**CREATE:** `src/domain/permissions.ts`, `src/app/(admin)/admin/unauthorized/page.tsx`, `src/components/admin/role-gate.tsx`
**CONSTRAINTS:** The permission matrix lives in one module imported by both server enforcement and client rendering, so the two can never drift. Per the specification, `ADMIN_TELKOMSEL` additionally sees offline-sales visibility and holds the destructive powers (force-release, status override, admin management). Logout revokes refresh tokens so a stolen cookie dies with the session.
**ACCEPTANCE:** Every operation has an explicit role requirement; `ADMIN_KAMPUS` is refused Telkomsel-only operations at the **server**, not merely in the UI; hidden actions are also blocked when called directly; logout invalidates the session on the server.
**TESTING:** Integration test iterating every operation × every role, asserting the matrix exactly — this is scenario L from the E2E catalogue.
**COMMIT:** `security(admin): implement role-based authorization and logout`

---

### B097 — Phase 10 verification gate
`PHASE: 10 · TYPE: Gate · SIZE: S · DEPS: B093–B096 · PARALLEL: no`

**TASK:** Attempt unauthenticated access to every admin route and endpoint. Attempt every Telkomsel-only operation as `ADMIN_KAMPUS`. Verify logout revocation. Run all suites.

**ACCEPTANCE:** No unauthorized access succeeds anywhere; the role matrix is enforced server-side without exception; logout revokes; all suites pass.
**STOP IF:** Any bypass exists.
**COMMIT:** `chore(admin): close phase 10 authentication gate`

---

# PHASE 11 — ADMIN DASHBOARD AND ORDERS

### B098 — Admin shell and navigation
`PHASE: 11 · TYPE: Frontend · SIZE: M · DEPS: B097 · PARALLEL: no`

**TASK:** Build the admin shell: sidebar navigation (Dashboard, Pesanan, Nomor, Konfigurasi) collapsing to a drawer on mobile, a header showing the signed-in admin and role with a logout control, breadcrumbs, and a content region. Role-aware navigation hides sections the current role cannot access.

**CREATE:** `src/app/(admin)/admin/layout.tsx`, `src/components/admin/admin-shell.tsx`, `src/components/admin/admin-nav.tsx`
**CONSTRAINTS:** Same tokens and typography as the student interface at higher density. Navigation is a real `<nav>` with a current-page indicator via `aria-current`. The mobile drawer traps focus and closes on Escape. The signed-in role is always visible, so an admin never has to guess why an action is missing.
**ACCEPTANCE:** Navigation works at mobile and desktop; role-aware items hide correctly; the drawer is accessible; the design language matches the student interface.
**TESTING:** Component tests for navigation state and the drawer; axe on the shell.
**COMMIT:** `feat(admin): build admin shell and navigation`

---

### B099 — Dashboard metrics operation
`PHASE: 11 · TYPE: Backend · SIZE: M · DEPS: B098 · PARALLEL: no`

**TASK:** Implement `adminGetDashboardMetrics` returning counts for available, reserved (live only), pending, sold, and sold-offline numbers; pending orders awaiting verification; orders verified and rejected today; the oldest pending order's age; and recent orders. Include operational alerts: pending orders older than 24 hours, and whether the cleanup job has run recently.

**CREATE:** `src/server/operations/admin/dashboard-metrics.ts`, `src/app/api/admin/dashboard/route.ts`
**CONSTRAINTS:** The reserved count uses effective status (lazy expiry), so an expired-but-uncleaned reservation is **not** counted as reserved — otherwise the dashboard misleads exactly when the janitor is failing, which is precisely when it must not. Use Firestore aggregation queries rather than reading whole collections. Cache for 30 seconds; a dashboard is not a real-time console.
**ACCEPTANCE:** Counts match the underlying data including under stale reservations; aggregation is used rather than full reads; alerts fire on their conditions; the cache expires correctly.
**TESTING:** Emulator tests with fixtures including expired-but-uncleaned reservations and aged pending orders.
**COMMIT:** `feat(admin): add dashboard metrics operation`

---

### B100 — Dashboard page
`PHASE: 11 · TYPE: Frontend · SIZE: M · DEPS: B099 · PARALLEL: no`

**TASK:** Build the dashboard: summary cards for each metric using the `data-display` treatment, an operational alerts panel, a recent-orders list linking through to detail, and quick actions. Include loading skeletons, an error state with retry, and an empty state for a fresh installation.

**CREATE:** `src/app/(admin)/admin/page.tsx`, `src/components/admin/metric-card.tsx`, `src/components/admin/alerts-panel.tsx`
**CONSTRAINTS:** Pending orders awaiting verification is the primary metric and is visually dominant — it is the only number that represents a student waiting on a human. Alerts are actionable, each linking to the relevant screen. Counts include a "last updated" timestamp so a cached figure is never mistaken for live.
**ACCEPTANCE:** All metrics render; alerts link correctly; loading, error, and empty states work; pending count is visually primary.
**TESTING:** Component tests per state; axe.
**COMMIT:** `feat(admin): build dashboard with metrics and alerts`

---

### B101 — Orders list operation
`PHASE: 11 · TYPE: Backend · SIZE: M · DEPS: B100 · PARALLEL: no`

**TASK:** Implement `adminListOrders` with server-side filtering (status, package, university, date range), search (order reference, name, number — normalised), sorting (submitted, verified, name), and cursor pagination. Return a list projection that excludes the proof path and the tracking hash.

**CREATE:** `src/server/operations/admin/list-orders.ts`, `src/app/api/admin/orders/route.ts`
**CONSTRAINTS:** All filtering, searching, and sorting happen server-side — client-side filtering of a paginated set produces confidently wrong results. Search over the phone number normalises the query first, so an admin pasting `+62811…` finds an order stored as `0811…`. Every filter combination has an index; where Firestore cannot serve a combination, the limitation is documented rather than silently returning a wrong result set.
**ACCEPTANCE:** Every filter, sort, and search works server-side; pagination is stable across concurrent writes; the projection omits proof paths and hashes; unsupported filter combinations are refused clearly.
**TESTING:** Emulator tests per filter, per sort, and for pagination stability.
**COMMIT:** `feat(admin): add orders list operation with server-side filtering`

---

### B102 — Orders table page
`PHASE: 11 · TYPE: Frontend · SIZE: L · DEPS: B101 · PARALLEL: no`

**TASK:** Build `/admin/pesanan`: a data table with status badges, order reference, number, customer, university, package, and submitted timestamp; a filter bar; debounced search; sortable headers; pagination controls; and a row action to open the detail view. On mobile the table becomes a card list.

**CREATE:** `src/app/(admin)/admin/pesanan/page.tsx`, `src/components/admin/orders-table.tsx`, `src/components/admin/filter-bar.tsx`, `src/components/ui/data-table.tsx`
**CONSTRAINTS:** A real `<table>` with proper headers and scope — a grid of divs is unusable with a screen reader. Sortable headers expose `aria-sort`. Filters are reflected in the URL so a filtered view can be shared and survives a refresh. Search is debounced at 300 ms with in-flight cancellation. Rows are keyboard-navigable.
**ACCEPTANCE:** Table renders with correct semantics; filters persist in the URL; sorting and pagination work; the mobile card layout is usable; axe passes.
**TESTING:** Component tests for sorting, filtering, and URL sync; axe on the table.
**COMMIT:** `feat(admin): build orders table with filtering and pagination`

---

### B103 — Order detail and proof viewer
`PHASE: 11 · TYPE: Full-stack · SIZE: L · DEPS: B102 · PARALLEL: no`

**TASK:** Implement `adminGetOrder` (full detail) and `adminGetProofUrl` (mints a 5-minute signed URL after the role check, and audits the access). Build the detail page: customer information, the selected number, the package with its **expected payment amount**, the payment proof viewer with zoom and rotate, the submission timeline, admin notes, and the verify/reject actions.

**CREATE:** `src/server/operations/admin/get-order.ts`, `src/server/operations/admin/get-proof-url.ts`, `src/app/(admin)/admin/pesanan/[id]/page.tsx`, `src/components/admin/proof-viewer.tsx`
**CONSTRAINTS:** Signed URLs are minted per request, never stored or cached client-side, and never logged. Every proof access writes an audit record — payment proofs are financial documents and viewing them should leave a trace. The expected amount is displayed prominently beside the proof, because with a single static QRIS the admin's only way to detect an underpayment is to compare by eye (assumption A7); making them hunt for the figure guarantees eventual mistakes. The viewer works with the keyboard and handles a failed image load without breaking the page.
**ACCEPTANCE:** Detail renders completely; the signed URL expires after five minutes; access is audited; the expected amount sits adjacent to the proof; the viewer is keyboard-operable; a broken image degrades gracefully.
**TESTING:** Integration tests for signed-URL expiry and audit writing; component tests for the viewer.
**COMMIT:** `feat(admin): add order detail view with audited proof access`

---

### B104 — Payment verification and rejection
`PHASE: 11 · TYPE: Backend · SIZE: L · DEPS: B103 · PARALLEL: no`

**TASK:** Implement `adminVerifyPayment` (transaction: order → `verified`, number → `sold`, set `verified_at`, `verified_by`, `sold_at`) and `adminRejectPayment` (transaction: order → `rejected`, number → `available`, clear reservation fields, require an `admin_note` explaining why). Wire both into the detail page with confirmation dialogs, optimistic-free loading states, and toasts.

**CREATE:** `src/server/operations/admin/verify-payment.ts`, `src/server/operations/admin/reject-payment.ts`
**CONSTRAINTS:** Both re-verify the order is still `pending` **inside** the transaction — two admins opening the same order is an ordinary Tuesday, and the second must be told the order was already handled rather than silently overwriting the first decision. Rejection requires a non-empty note, which the student will read, so the UI must say so. Both operations are idempotency-keyed. Neither is reversible through the normal UI; reversal is a documented `RUNBOOK.md` procedure requiring `ADMIN_TELKOMSEL`.
**DO NOT:** use optimistic UI here. Showing "verified" before the server confirms it, on an irreversible financial action, is worse than a half-second wait.

**ACCEPTANCE:** Verification moves both documents atomically; rejection returns the number to the pool; a note is mandatory for rejection; a second admin acting on an already-handled order is told clearly; both are audited; concurrent verify and reject on one order produces exactly one outcome.
**TESTING:** Emulator tests including the concurrent-admin case (E2E scenarios H and I).
**COMMIT:** `feat(admin): add payment verification and rejection operations`

---

### B105 — Phase 11 verification gate
`PHASE: 11 · TYPE: Gate · SIZE: M · DEPS: B098–B104 · PARALLEL: no`

**TASK:** Walk the full admin order workflow: list, filter, open, view proof, verify, and reject. Confirm state transitions in Firestore after each. Verify audit records exist for every action. Run axe on every admin screen. Run all suites.

**ACCEPTANCE:** Workflow completes; every transition is correct; audit trail complete; no axe violations; all suites pass.
**STOP IF:** Any state transition leaves the data inconsistent, or an action is unaudited.
**COMMIT:** `chore(admin): close phase 11 orders management gate`

---

# PHASE 12 — ADMIN NUMBER INVENTORY

### B106 — Numbers table page
`PHASE: 12 · TYPE: Frontend · SIZE: L · DEPS: B105 · PARALLEL: no`

**TASK:** Build `/admin/nomor` on the operations from B058: a table with the number, status badge, reservation details where relevant, sold timestamp, last update, and available actions per row. Filter by status, search by digit, sort, and paginate. Show the effective status, with an indicator where the stored status is stale relative to expiry.

**CREATE:** `src/app/(admin)/admin/nomor/page.tsx`, `src/components/admin/numbers-table.tsx`
**CONSTRAINTS:** Display **effective** status, not raw stored status, and mark the difference visibly — an admin looking at a number whose reservation expired four minutes ago must not think it is still held. Row actions are derived from `getAvailableActions(status, role)` so the UI can never offer an action the server will refuse.
**ACCEPTANCE:** Effective status is shown with staleness indicated; row actions match server permissions exactly; filtering, search, sorting, and pagination work; mobile layout is usable.
**TESTING:** Component tests including the stale-reservation display case.
**COMMIT:** `feat(admin): build number inventory table`

---

### B107 — Add and bulk-add numbers
`PHASE: 12 · TYPE: Frontend · SIZE: M · DEPS: B106 · PARALLEL: no`

**TASK:** Build single-add and bulk-add (paste a list) interfaces over `adminAddNumbers`. Bulk add shows a preview before committing: which entries are valid, which are duplicates of existing numbers, which are invalid and why. After commit, show a per-entry result summary.

**CREATE:** `src/components/admin/add-number-dialog.tsx`, `src/components/admin/bulk-add-dialog.tsx`
**CONSTRAINTS:** Preview-before-commit is required — an admin pasting 200 numbers deserves to see what will happen before it happens. Accept any separator (newline, comma, space) and normalise on parse. Partial success is normal and is reported per entry, not collapsed into "some failed". The 200-entry cap is enforced client-side with a clear message before the request.
**ACCEPTANCE:** Preview classifies every entry correctly; commit reports per-entry outcomes; duplicates against existing inventory are detected before commit; mixed valid/invalid input succeeds partially with a clear report.
**TESTING:** Component tests with mixed input; integration test for partial success.
**COMMIT:** `feat(admin): add single and bulk number creation`

---

### B108 — Destructive inventory actions
`PHASE: 12 · TYPE: Frontend · SIZE: M · DEPS: B107 · PARALLEL: no`

**TASK:** Wire remove, mark-sold-offline, force-release, and status override into the table with confirmation dialogs. Each dialog states exactly what will change, whether it is reversible, and requires a reason where the operation demands one. Show audit metadata on the row after the action.

**MODIFY:** numbers table; **CREATE:** `src/components/admin/number-actions.tsx`
**CONSTRAINTS:** Confirmation copy names the specific number and the specific consequence — "Hapus nomor 0811 1234 5678?" not "Are you sure?". Force-release states plainly that a student currently holds this number and will lose it. Status override requires a typed confirmation, since it bypasses the lifecycle rules the rest of the system depends on. Destructive actions default focus to Cancel.
**ACCEPTANCE:** Every dialog names the number and the consequence; reasons are captured and stored; irreversible actions require typed confirmation; the server refuses anything the UI would have refused; audit metadata appears after the action.
**TESTING:** Component tests per action; integration tests confirming server-side refusal of illegal transitions.
**COMMIT:** `feat(admin): add guarded destructive inventory actions`

---

### B109 — Phase 12 verification gate
`PHASE: 12 · TYPE: Gate · SIZE: S · DEPS: B106–B108 · PARALLEL: no`

**TASK:** Exercise every inventory action including illegal attempts. Verify audit records. Confirm a number marked `SOLD_OFFLINE` cannot be reserved by a student (E2E scenario J). Run all suites.

**ACCEPTANCE:** All legal actions succeed and all illegal ones are refused; audit complete; offline-sold numbers are unreservable; all suites pass.
**STOP IF:** A student can reserve a number in any non-available state.
**COMMIT:** `chore(admin): close phase 12 inventory management gate`

---

# PHASE 13 — CONFIGURATION MANAGEMENT

### B110 — Package configuration admin
`PHASE: 13 · TYPE: Full-stack · SIZE: M · DEPS: B109 · PARALLEL: no`

**TASK:** Implement `adminManagePackages` and build `/admin/konfigurasi/paket`: list packages with all attributes, edit price and metadata, toggle active, toggle recommended, reorder, and flip `price_status` from `draft` to `confirmed`.

**CREATE:** `src/server/operations/admin/manage-packages.ts`, `src/app/(admin)/admin/konfigurasi/paket/page.tsx`
**CONSTRAINTS:** Prices are entered in rupiah and stored as integers — floating-point currency is a bug waiting for a rounding edge case. Deactivating a package used by pending orders is permitted but warns and names the affected count, since those orders must still display correctly. Only `ADMIN_TELKOMSEL` may change a price or confirm one. Every change is audited with before and after values. Confirming a price is a deliberate, separate action from editing it (OQ-1).
**ACCEPTANCE:** All attributes are editable with validation; prices store as integers; deactivation warns with affected order counts; role enforcement holds; `price_status` transitions are audited.
**TESTING:** Integration tests for editing, deactivation warnings, role enforcement, and audit.
**COMMIT:** `feat(admin): add package configuration management`

---

### B111 — University and payment configuration admin
`PHASE: 13 · TYPE: Full-stack · SIZE: M · DEPS: B110 · PARALLEL: no`

**TASK:** Implement `adminManageUniversities` (add, edit, deactivate, reorder) and `adminUpdatePaymentConfig` (upload a new QRIS image with preview, edit the payment label and instructions). Build both screens.

**CREATE:** `src/server/operations/admin/manage-universities.ts`, `src/server/operations/admin/update-payment-config.ts`, `src/app/(admin)/admin/konfigurasi/kampus/page.tsx`, `src/app/(admin)/admin/konfigurasi/pembayaran/page.tsx`
**CONSTRAINTS:** A university with existing orders is deactivated, never deleted — deleting it would orphan historical records that must remain readable. The QRIS upload runs through the same validation and re-encode pipeline as payment proofs (B083); an admin-supplied file is still an untrusted file. Preview the new QR **and require the admin to confirm they have scanned it** before it goes live, because a broken QRIS silently breaks every payment until someone notices. The previous QRIS is retained for rollback. Only `ADMIN_TELKOMSEL` may change payment configuration.
**ACCEPTANCE:** Universities can be added, edited, deactivated, and reordered; deletion is refused where orders exist; QRIS upload validates and previews; the scan-confirmation step is enforced; the previous image is retained; role enforcement holds.
**TESTING:** Integration tests for the deactivation guard, the QRIS pipeline, and role enforcement.
**DOCS:** Add the QRIS update procedure to `RUNBOOK.md` (OQ-6).
**COMMIT:** `feat(admin): add university and payment configuration management`

---

### B112 — Phase 13 verification gate
`PHASE: 13 · TYPE: Gate · SIZE: S · DEPS: B110–B111 · PARALLEL: no`

**TASK:** Change each configuration value and verify it propagates to the student interface within the cache TTL. Confirm no hardcoded configuration value survives anywhere. Run all suites.

**ACCEPTANCE:** Configuration changes reach students; a grep for hardcoded prices, TTLs, and university names returns nothing outside seed scripts; all suites pass.
**VERIFY:** `grep -rE "100000|pkg_|Universitas " src/components src/app --include=*.tsx` returns no business data.
**STOP IF:** Any business value is hardcoded in a component.
**COMMIT:** `chore(admin): close phase 13 configuration gate`
