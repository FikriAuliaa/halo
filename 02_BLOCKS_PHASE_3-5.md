# PART D — CLAUDE CODE BLOCKS · Phases 3–5 (B032–B060)

> Prepend **SP-1** (see `01_BLOCKS_PHASE_0-2.md`) to every block.

---

# PHASE 3 — DESIGN SYSTEM

The reference is a visual contract, not inspiration. Every block in this phase is checked against the screenshots, not only against `DESIGN.md`.

### B032 — Design tokens and Tailwind configuration
`PHASE: 3 · TYPE: Design system · SIZE: M · DEPS: B031, B010 · PARALLEL: no`

**OBJECTIVE:** Encode the canonical token set once, so no component ever hardcodes a colour.

**CONTEXT:** The supplied HTML files ship working Tailwind v3 config objects that disagree with each other. `DESIGN.md` (written in B010) resolved the conflict; this block implements that resolution.

**TASK:** Configure `tailwind.config.ts` with the canonical colour tokens, the purpose-named additions (`card-gradient-start`, `divider`, `brand-red`, `highlight-orange`), the radius scale, the 4 px spacing scale including `container-margin: 20px` and `gutter: 12px`, and the typography scale as named `fontSize` entries carrying size, weight, line-height, and letter-spacing together. Expose the same values as CSS custom properties in `globals.css`. Load Hanken Grotesk and Inter via `next/font` with `display: swap` and preconnect, exposing them as CSS variables. Add the `card-gradient` utility (`linear-gradient(180deg, #4a0000 0%, #000000 100%)`), the `no-scrollbar` utility, and the orange glow ring used for selected states.

**INSPECT:** `DESIGN.md`, the five `code.html` files.
**CREATE:** `tailwind.config.ts`, `src/app/globals.css`, `src/lib/fonts.ts`
**CONSTRAINTS:** Fonts load through `next/font` — no render-blocking `<link>` to Google Fonts. Token names match `DESIGN.md` exactly. No raw hex outside these two files.
**DO NOT:** copy any HTML file's config verbatim; they conflict.

**ACCEPTANCE:**
1. Every `DESIGN.md` token resolves in a Tailwind class.
2. Fonts load without a layout shift; a fallback stack with matching metrics is configured.
3. `card-gradient`, `no-scrollbar`, and the glow ring render correctly.
4. A grep for `#[0-9a-fA-F]{6}` outside `tailwind.config.ts` and `globals.css` returns nothing.

**VERIFY:** Build a temporary swatch page rendering every token, compare against `screen.png` files, then delete it.
**TESTING:** Snapshot test asserting the resolved config object matches `DESIGN.md` values.
**DOCS:** Note in `DESIGN.md` that tokens are now implemented and where.
**STOP IF:** A `DESIGN.md` token has no defensible value.
**COMMIT:** `style(design): implement premium crimson pulse design tokens`

---

### B033 — Typography primitives
`PHASE: 3 · TYPE: Design system · SIZE: S · DEPS: B032 · PARALLEL: yes`

**TASK:** Build `Text` and `Heading` components mapping the named scale (`display-lg`, `headline-lg`, `headline-lg-mobile`, `title-md`, `body-lg`, `body-sm`, `label-bold`, `data-display`) to correct semantic elements, with an `as` prop so visual weight never dictates heading level. Add a `DataDisplay` component for the large figures ("160", "GB") that composes the split-unit treatment the package cards use.

**CREATE:** `src/components/ui/text.tsx`, `src/components/ui/heading.tsx`, `src/components/ui/data-display.tsx`
**CONSTRAINTS:** `headline-lg-mobile` applies below 768 px and `headline-lg` above, via responsive classes rather than JavaScript. Heading level and visual size are independent.
**ACCEPTANCE:** All eight styles render per spec; `as` decouples semantics from appearance; `DataDisplay` matches the package-card treatment.
**TESTING:** Component tests asserting the rendered element for each `as` value.
**COMMIT:** `feat(ui): add typography primitives`

---

### B034 — Button component
`PHASE: 3 · TYPE: Design system · SIZE: M · DEPS: B033 · PARALLEL: yes`

**TASK:** Build `Button` with variants `primary` (solid `brand-red`, white bold label, pill), `secondary` (outlined), `ghost`, `destructive`; sizes `sm`/`md`/`lg`; and states default, hover, active (`scale-95`), focus-visible, disabled, and loading. Loading shows a spinner, disables interaction, preserves button width to prevent layout shift, and announces via `aria-busy`. Support an optional trailing icon (the reference uses `arrow_forward` and `send`).

**CREATE:** `src/components/ui/button.tsx`
**CONSTRAINTS:** Minimum touch target 44×44 px. Focus-visible ring must meet 3:1 against the adjacent background. The primary CTA carries the red glow shadow from the reference. Per `DESIGN.md`, CTAs are pill-shaped — the package screen's `rounded-xl` CTA is the documented outlier and is not followed.
**DO NOT:** disable a button without an accessible explanation of why.

**ACCEPTANCE:** All variants and states render; loading prevents double submission; keyboard activation works via both Enter and Space; touch targets verified.
**TESTING:** Component tests for click-while-loading (must not fire), disabled state, and keyboard activation.
**COMMIT:** `feat(ui): add button component with full state coverage`

---

### B035 — Form field components
`PHASE: 3 · TYPE: Design system · SIZE: M · DEPS: B034 · PARALLEL: yes`

**TASK:** Build `TextField`, `PhoneField` (fixed `+62` prefix affordance per the design), `EmailField`, and `SelectField` (Radix Select, styled to the dark surface). Each has a label above the field in `on-surface-variant`, dark background, a 2 px bottom border that highlights in `brand-red` on focus, an error state with an icon and message, a helper-text slot, and a disabled state.

**CREATE:** `src/components/ui/text-field.tsx`, `phone-field.tsx`, `email-field.tsx`, `select-field.tsx`, `field-wrapper.tsx`
**CONSTRAINTS:** Every field uses a real `<label for>` — placeholders are not labels. Errors link via `aria-describedby` and set `aria-invalid`. Mobile keyboards are correct: `inputMode="numeric"` for phone, `type="email"` with `autoComplete="email"`. `PhoneField` accepts pasted `+62…`, `62…`, and `08…` and normalises on blur.
**DO NOT:** use `aria-label` where a visible label exists.

**ACCEPTANCE:** Screen reader announces label, then value, then error; focus styling matches the reference; paste normalisation works for all three shapes; select is keyboard-navigable and type-ahead works.
**TESTING:** Component tests per field for error announcement, keyboard interaction, and paste normalisation.
**COMMIT:** `feat(ui): add accessible form field components`

---

### B036 — Card and surface components
`PHASE: 3 · TYPE: Design system · SIZE: M · DEPS: B032 · PARALLEL: yes`

**TASK:** Build `Card` (base, `surface-container` background, `divider` border, 12 px radius), `GradientCard` (the crimson-to-black gradient used by package cards, 16 px radius), and `SelectableCard` wrapping either with selection behaviour: unselected, hover, selected (orange glow ring), and disabled/locked.

**CREATE:** `src/components/ui/card.tsx`, `src/components/ui/selectable-card.tsx`
**CONSTRAINTS:** `SelectableCard` renders as a `<button>` or a labelled radio, never a clickable `<div>`. Selection is conveyed by `aria-pressed` or `aria-checked`, not by colour alone — a second signifier (border weight or an icon) is required for colour-blind users.
**ACCEPTANCE:** All four states render; keyboard selection works; selection is programmatically detectable; radii match `DESIGN.md`.
**TESTING:** Component tests for keyboard selection and ARIA state.
**COMMIT:** `feat(ui): add card and selectable card components`

---

### B037 — Chip and badge components
`PHASE: 3 · TYPE: Design system · SIZE: S · DEPS: B032 · PARALLEL: yes`

**TASK:** Build `Chip` (small rounded container, `#4a0000` background — used for "Extra Benefits" and the informational package chips) and `Badge` with variants for the number-card lock state ("Terkunci", orange `secondary-container`), the "Rekomendasi" package badge, and admin status badges for all five number states and three order states.

**CREATE:** `src/components/ui/chip.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/status-badge.tsx`
**CONSTRAINTS:** `StatusBadge` maps status → colour in one place, imported everywhere. Each badge includes text, never colour alone. Status labels are Indonesian and defined centrally.
**ACCEPTANCE:** Every status has a distinct, accessible badge; the mapping exists in exactly one module; the lock badge matches the reference.
**COMMIT:** `feat(ui): add chip, badge and status badge components`

---

### B038 — Progress bar and reservation timer
`PHASE: 3 · TYPE: Design system · SIZE: M · DEPS: B037 · PARALLEL: no`

**OBJECTIVE:** Build the countdown component that the supplied design does not contain.

**CONTEXT:** No design screen shows a timer (contradiction C6), yet the reservation TTL is the core anti-double-booking mechanism and the student must see it. `DESIGN.md` specifies the dual-tone progress bar this is built from. **The timer is presentation only — server time is truth.**

**TASK:** Build `ProgressBar` (dark-red base, bright-red or orange indicator) and `ReservationTimer` on top of it. The timer receives an absolute server-provided `reservedUntil` ISO timestamp and a clock offset measured at fetch time, never a client-computed duration. It renders remaining time as `MM:SS` plus a depleting bar, shifts to `error` colour under two minutes, announces at 5 minutes, 2 minutes, and 30 seconds via `aria-live="polite"`, and fires `onExpire` exactly once. It recomputes from wall-clock on every tick so a backgrounded tab or a sleeping phone resumes with the correct value rather than a drifted one. Under `prefers-reduced-motion` the bar steps per second instead of animating continuously.

**CREATE:** `src/components/ui/progress-bar.tsx`, `src/components/student/reservation-timer.tsx`, `src/hooks/use-countdown.ts`
**CONSTRAINTS:** No `setInterval` accumulation arithmetic. `onExpire` is idempotent. `aria-live` is `polite` — `assertive` would interrupt a screen-reader user mid-field.
**DO NOT:** treat timer expiry as authoritative; it triggers a server revalidation, it does not itself release anything.

**ACCEPTANCE:**
1. Countdown is accurate against a mocked clock, including after a simulated 60-second tab suspension.
2. `onExpire` fires exactly once even when the tab wakes long after expiry.
3. Announcements occur at the three thresholds only.
4. Reduced-motion is honoured.

**TESTING:** Unit tests with fake timers covering suspension, expiry-while-hidden, and clock skew in both directions.
**DOCS:** Record the component in `DESIGN.md` under Implementation decisions.
**COMMIT:** `feat(ui): add progress bar and server-anchored reservation timer`

---

### B039 — Dialog and modal
`PHASE: 3 · TYPE: Design system · SIZE: M · DEPS: B034 · PARALLEL: yes`

**TASK:** Build `Dialog` on Radix with the 60 % black backdrop and 20 px blur from `DESIGN.md`, plus `ConfirmDialog` for destructive admin actions (title, body, cancel, confirm with variant, loading state, and optional typed confirmation for irreversible operations).

**CREATE:** `src/components/ui/dialog.tsx`, `src/components/ui/confirm-dialog.tsx`
**CONSTRAINTS:** Focus is trapped, restored on close, and Escape closes unless an operation is in flight. Background scroll is locked. Destructive confirmation defaults to the safe choice.
**ACCEPTANCE:** Focus trap verified by keyboard; focus returns to the trigger; Escape is blocked during a pending operation; `aria-modal` and labelling are correct.
**TESTING:** Component tests for focus trap, restoration, and Escape handling.
**COMMIT:** `feat(ui): add accessible dialog and confirmation dialog`

---

### B040 — Toast notifications
`PHASE: 3 · TYPE: Design system · SIZE: S · DEPS: B032 · PARALLEL: yes`

**TASK:** Build a toast system with success, error, warning, and info variants, a provider, and a `useToast` hook. Auto-dismiss after a duration proportional to message length (errors persist until dismissed), manual dismiss, and a stack cap of three.

**CREATE:** `src/components/ui/toast.tsx`, `src/components/ui/toast-provider.tsx`, `src/hooks/use-toast.ts`
**CONSTRAINTS:** Container is a `role="status"` region with `aria-live="polite"`; errors use `role="alert"`. Toasts never carry the only copy of important information — an order reference goes on the page, not in a toast.
**ACCEPTANCE:** Variants render; auto-dismiss timing scales with length; errors persist; the stack caps at three; announcements reach a screen reader.
**COMMIT:** `feat(ui): add toast notification system`

---

### B041 — File uploader (presentational)
`PHASE: 3 · TYPE: Design system · SIZE: M · DEPS: B034 · PARALLEL: yes`

**TASK:** Build `FileUploader` matching the reference: dashed border, `cloud_upload` icon, "Unggah Bukti Pembayaran", "Format JPG, PNG (Max 5MB)". States: idle, drag-over, selected-with-preview, uploading with a determinate progress bar, error, and success. Actions: choose, drag-and-drop, remove, replace, cancel in-flight, retry after failure.

**CREATE:** `src/components/ui/file-uploader.tsx`
**CONSTRAINTS:** Presentational only — accepts callbacks and state, performs no upload and no security validation. It may perform *client-side convenience* checks on type and size to give fast feedback, clearly commented as UX-only and not a security control. The file input remains keyboard-reachable and labelled. Preview URLs are revoked on unmount to avoid a memory leak.
**DO NOT:** implement upload logic here; that is B083.

**ACCEPTANCE:** All six states render; drag-and-drop and keyboard both work; cancel and retry function against a mocked handler; preview URLs are revoked.
**TESTING:** Component tests per state, plus a leak check on unmount.
**COMMIT:** `feat(ui): add file uploader component`

---

### B042 — Loading skeletons
`PHASE: 3 · TYPE: Design system · SIZE: S · DEPS: B036 · PARALLEL: yes`

**TASK:** Build `Skeleton` plus composed skeletons matching the real layouts of the number grid, package scroller, order form, and admin table, so nothing shifts when content arrives.

**CREATE:** `src/components/ui/skeleton.tsx`, `src/components/ui/skeletons/*.tsx`
**CONSTRAINTS:** Skeletons match real dimensions exactly. Shimmer is disabled under reduced motion. `aria-busy="true"` on the container; individual skeletons are `aria-hidden`.
**ACCEPTANCE:** No cumulative layout shift when swapping skeleton for content; reduced-motion honoured; screen readers announce loading once, not per skeleton.
**COMMIT:** `feat(ui): add loading skeleton components`

---

### B043 — Empty and error states
`PHASE: 3 · TYPE: Design system · SIZE: S · DEPS: B034 · PARALLEL: yes`

**TASK:** Build `EmptyState` (icon, title, description, optional action) and `ErrorState` (variants: network, server, not-found, forbidden, expired) with retry where retrying is meaningful. Provide preset content for: no numbers available, no search results, no orders, reservation expired, network failure.

**CREATE:** `src/components/ui/empty-state.tsx`, `src/components/ui/error-state.tsx`
**CONSTRAINTS:** Messages are Indonesian, plain, and actionable. Never surface a raw error code or stack trace to a student; admins may see a correlation ID. Retry is offered only where it can succeed — an expired reservation offers "pilih nomor lain", not "coba lagi".
**ACCEPTANCE:** Every preset renders; no technical detail leaks; retry appears only where meaningful.
**COMMIT:** `feat(ui): add empty and error state components`

---

### B044 — Application shell
`PHASE: 3 · TYPE: Design system · SIZE: M · DEPS: B033, B038 · PARALLEL: no`

**TASK:** Build the student shell from the reference: sticky header with the "5G · Powered by AI · Halo" lockup on a `surface-container-highest`-to-transparent gradient; a scrollable content region; a fixed bottom CTA bar with the black gradient fade; and the 480 px max-width column centred within an ambient field on wider viewports. Include a slot for the reservation timer beneath the header.

**CREATE:** `src/components/student/student-shell.tsx`, `src/app/(student)/layout.tsx`
**CONSTRAINTS:** Bottom CTA must respect `env(safe-area-inset-bottom)` on notched devices. Content padding accounts for both fixed bars so nothing is obscured. Header is `<header>`, content is `<main>`, CTA bar is inside a landmark.
**ACCEPTANCE:** Matches the reference at 390 px; no content hides behind fixed bars; safe-area respected; landmarks correct.
**VERIFY:** Compare against all five screenshots at 390 px width.
**COMMIT:** `feat(ui): add student application shell`

---

### B045 — Step indicator
`PHASE: 3 · TYPE: Design system · SIZE: S · DEPS: B033 · PARALLEL: yes`

**TASK:** Build a four-step indicator (Nomor → Paket → Data → Bayar) with completed, current, and upcoming states, in the design's circular-indicator language.

**CREATE:** `src/components/student/step-indicator.tsx`
**CONSTRAINTS:** Uses `<ol>` with `aria-current="step"`. Completed steps are not links — backward navigation is governed by reservation state, not by the indicator.
**ACCEPTANCE:** Three states render; screen reader announces "step 2 of 4"; not interactive.
**COMMIT:** `feat(ui): add ordering step indicator`

---

### B046 — Responsive layout behaviour
`PHASE: 3 · TYPE: Design system · SIZE: M · DEPS: B044 · PARALLEL: no`

**OBJECTIVE:** Define deliberate tablet and desktop behaviour, which the mobile-only reference does not provide.

**TASK:** Implement the responsive rules from `DESIGN.md`: at ≥768 px the number grid moves to two columns and at ≥1024 px to three; the package scroller becomes a grid at ≥1024 px while remaining a snap-scroller below; forms gain a wider comfortable measure without stretching to full width; the fixed bottom CTA becomes inline at desktop where the viewport no longer needs it fixed. Verify stability at the awkward intermediate widths (600, 768, 834, 1024, 1280 px).

**CREATE:** `src/components/ui/responsive-grid.tsx`
**MODIFY:** shell and layout components
**CONSTRAINTS:** Mobile-first. Do not merely scale the mobile design up — a 480 px column on a 1440 px screen with dead space either side is a failure, not a neutral outcome; use the ambient gradient field deliberately.
**ACCEPTANCE:** Layout is stable at all six tested widths; no horizontal scroll at any width from 320 px up; touch targets stay ≥44 px on touch devices.
**TESTING:** Playwright screenshots at each width.
**COMMIT:** `feat(ui): implement deliberate responsive layout behaviour`

---

### B047 — Phase 3 verification gate
`PHASE: 3 · TYPE: Gate · SIZE: M · DEPS: B032–B046 · PARALLEL: no`

**TASK:** Build a component gallery route (dev-only, excluded from production builds) rendering every component in every state. Run axe against it. Compare against the five screenshots. Run lint, typecheck, unit tests, build.

**CREATE:** `src/app/(dev)/gallery/page.tsx`
**ACCEPTANCE:** Zero axe violations; every documented state is represented; visual comparison shows no material divergence; the route is absent from a production build.
**VERIFY:** Confirm the gallery 404s when `NODE_ENV=production`.
**STOP IF:** Any axe violation of serious or critical severity remains.
**COMMIT:** `test(ui): add component gallery and close phase 3 gate`

---

# PHASE 4 — BACKEND FOUNDATION

### B048 — Firestore initialisation and typed converters
`PHASE: 4 · TYPE: Backend · SIZE: M · DEPS: B031, B014 · PARALLEL: no`

**TASK:** Create the Admin SDK singleton with emulator detection and connection reuse across hot reloads. Implement typed `FirestoreDataConverter`s for `numbers`, `orders`, and each `config` document, converting between Firestore `Timestamp` and domain types at the boundary so `Timestamp` never leaks into domain or UI code. Add a typed collection-reference helper.

**CREATE:** `src/server/firestore/client.ts`, `src/server/firestore/converters.ts`, `src/server/firestore/collections.ts`
**CONSTRAINTS:** No Firestore type appears outside `src/server/firestore/`. Converters validate on read and fail loudly on malformed documents rather than returning a half-built object.
**ACCEPTANCE:** Converters round-trip correctly; malformed documents throw a typed error; hot reload does not leak connections.
**TESTING:** Integration tests against the emulator for round-trip and malformed-document handling.
**COMMIT:** `feat(server): add typed firestore client and converters`

---

### B049 — Domain schemas and validation
`PHASE: 4 · TYPE: Backend · SIZE: M · DEPS: B048 · PARALLEL: no`

**TASK:** Define Zod schemas in `src/schemas/` for every entity and every operation input: phone number (with normalisation), number document, order document, order form input, each config document, admin inputs, and tracking lookup input. Export inferred TypeScript types. Include Indonesian error messages so client and server produce identical text.

**CREATE:** `src/schemas/number.ts`, `order.ts`, `config.ts`, `admin.ts`, `common.ts`, `index.ts`
**CONSTRAINTS:** One schema per concept, shared by client and server — divergence between the two validations is the bug this prevents. Server-side validation is never skipped because the client already validated.
**ACCEPTANCE:** Every `API_SPEC.md` input has a schema; messages are Indonesian; types are inferred, never hand-written.
**TESTING:** Unit tests per schema covering valid, invalid, and boundary inputs, and every accepted phone format.
**COMMIT:** `feat(schemas): define shared domain validation schemas`

---

### B050 — Repository layer
`PHASE: 4 · TYPE: Backend · SIZE: L · DEPS: B049 · PARALLEL: no`

**TASK:** Implement `NumberRepository`, `OrderRepository`, and `ConfigRepository` as the only modules that touch Firestore. Methods cover reads, paginated queries with cursors, writes, and transaction participation. `ConfigRepository` caches with a short TTL and exposes explicit invalidation, since config changes rarely but is read on nearly every request.

**CREATE:** `src/server/repositories/number-repository.ts`, `order-repository.ts`, `config-repository.ts`, `types.ts`
**CONSTRAINTS:** Repositories contain **no business rules** — no status-transition logic, no expiry decisions. They read and write. Domain logic lives in `src/domain/` and orchestration in `src/server/operations/`. Every write sets `updated_at` from the server. Pagination is cursor-based; offset pagination degrades badly and cannot express a stable ordering across mutations.
**DO NOT:** put transition validation in a repository.

**ACCEPTANCE:** All `API_SPEC.md` data access is expressible; no business rule is present; pagination is stable across concurrent writes.
**TESTING:** Emulator integration tests per repository, including pagination with concurrent inserts.
**COMMIT:** `feat(server): add typed repository layer`

---

### B051 — Operation framework, error model, and structured logging
`PHASE: 4 · TYPE: Backend · SIZE: M · DEPS: B050 · PARALLEL: no`

**TASK:** Build the wrapper every Route Handler uses: parse and validate the request against its schema, resolve the session cookie, enforce auth and role where required, execute, map results to the response envelope, catch and classify errors, and log. Implement the `AppError` hierarchy mapped to the `API_SPEC.md` codes. Implement structured JSON logging with a per-request correlation ID propagated into every log line and returned in a response header.

**CREATE:** `src/server/framework/handler.ts`, `src/server/framework/errors.ts`, `src/server/framework/logger.ts`, `src/server/framework/session.ts`
**CONSTRAINTS:** Unexpected errors log fully server-side and return only `INTERNAL` plus the correlation ID to the caller. **Redaction is applied at the logger, not at call sites** — phone, email, name, and token values are redacted centrally, because a rule enforced at every call site is a rule that will eventually be forgotten at one.
**ACCEPTANCE:** Validation failures return field-level errors; internal errors leak nothing; every log line carries the correlation ID; a deliberate PII log attempt comes out redacted.
**TESTING:** Unit tests for error mapping and redaction, including nested objects and arrays.
**COMMIT:** `feat(server): add operation framework, error model and structured logging`

---

### B052 — Idempotency and rate limiting primitives
`PHASE: 4 · TYPE: Backend · SIZE: M · DEPS: B051 · PARALLEL: no`

**TASK:** Implement idempotency: a caller-supplied key stored in an `idempotency/{key}` document holding status, the cached response, and an expiry. A repeat key returns the cached response instead of re-executing. Implement fixed-window rate limiting in Firestore keyed by IP plus operation, with per-operation limits from config, returning `RATE_LIMITED` with `Retry-After`.

**CREATE:** `src/server/framework/idempotency.ts`, `src/server/framework/rate-limit.ts`
**CONSTRAINTS:** Idempotency records expire after 24 hours. The record is created **inside** the same transaction as the mutation it protects, or the guarantee is decorative. Rate limiting fails **open** with a warning log if Firestore is unavailable — a rate limiter that takes the whole system down when it breaks is worse than the abuse it prevents. The tracking endpoint is the exception and fails closed, because that limit is a brute-force control, not a fairness control.
**ACCEPTANCE:** A duplicate key returns the cached response without re-execution; concurrent identical keys do not both execute; limits enforce and reset; `Retry-After` is accurate; the fail-open/fail-closed split behaves as specified.
**TESTING:** Emulator tests for duplicate keys fired concurrently, and for limit enforcement and reset.
**COMMIT:** `feat(server): add idempotency and rate limiting primitives`

---

### B053 — Security rules and indexes (initial)
`PHASE: 4 · TYPE: Security · SIZE: M · DEPS: B050 · PARALLEL: no`

**TASK:** Write `firestore.rules` denying all client access by default, with narrowly-scoped admin read exceptions only where a genuine need is demonstrated. Write `storage.rules` denying all client access. Define `firestore.indexes.json` covering every query in the repository layer. Write the rules test suite.

**CREATE:** `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `tests/rules/*.test.ts`
**CONSTRAINTS:** Since all access is server-mediated via the Admin SDK (which bypasses rules), rules are defence-in-depth against a leaked client config. Start from total denial and justify each exception in a comment naming the requirement.
**ACCEPTANCE:** Rules tests prove unauthenticated and non-admin clients cannot read or write any collection; every repository query has a matching index; the deploy of indexes succeeds against the emulator.
**TESTING:** `@firebase/rules-unit-testing` suite covering each collection for anonymous, authenticated-non-admin, and each admin role.
**COMMIT:** `security(firestore): add deny-by-default rules and query indexes`

---

### B054 — Phase 4 verification gate
`PHASE: 4 · TYPE: Gate · SIZE: S · DEPS: B048–B053 · PARALLEL: no`

**TASK:** Run lint, typecheck, unit, and emulator integration tests. Confirm no Firestore type escapes the server directory and no business rule sits in a repository. Confirm rules tests pass. Update `ARCHITECTURE.md` and `DATA_MODEL.md` with any deviation.

**ACCEPTANCE:** All suites pass; layering verified by grep; docs match implementation.
**VERIFY:** `grep -r "firebase-admin\|Timestamp" src/ --include=*.ts | grep -v "src/server/firestore"` returns nothing.
**STOP IF:** Layering is violated — fix before Phase 5, since every later block inherits the structure.
**COMMIT:** `chore(server): close phase 4 backend foundation gate`

---

# PHASE 5 — NUMBER INVENTORY

### B055 — Phone normalisation and validation domain module
`PHASE: 5 · TYPE: Domain · SIZE: S · DEPS: B054 · PARALLEL: no`

**OBJECTIVE:** One authority for what a valid Indonesian mobile number is, and one canonical storage form.

**CONTEXT:** The spec requires `08…` with 10–13 digits; the design's form shows a `+62` prefix (contradiction C5). Inconsistent handling here corrupts the inventory keys.

**TASK:** Implement `normalizePhone` (accepts `08…`, `+628…`, `628…`, with spaces, hyphens, parentheses, and non-breaking spaces; returns canonical `08…`), `isValidIndonesianMobile`, `formatPhoneDisplay` (grouped as the reference shows, `0811 - 1234 - 5678`), and `formatPhoneCompact`.

**CREATE:** `src/domain/phone.ts`
**CONSTRAINTS:** Canonical storage form is `08…` since it is the document ID and the spec's stated format. Normalisation is total: any input either normalises or is rejected with a reason — it never silently returns something plausible.
**ACCEPTANCE:** All accepted input shapes normalise identically; invalid inputs are rejected with a specific reason; display formatting matches the reference exactly.
**TESTING:** Unit tests over a table of ~30 inputs including all separators, wrong prefixes, too short, too long, non-digits, empty, and Unicode whitespace.
**COMMIT:** `feat(domain): add phone normalisation and validation`

---

### B056 — Seed importer with reconciliation reporting
`PHASE: 5 · TYPE: Data · SIZE: L · DEPS: B055, B006 · PARALLEL: no`

**OBJECTIVE:** Load the number pool deterministically, idempotently, and with a report that never hides what happened.

**CONTEXT:** B006 verified the source dataset is clean (96 unique, all valid). The importer must **prove** that on every run, not assume it.

**TASK:** Build a script that reads `data/seed/numbers.source.txt`, normalises and validates each entry, detects duplicates, and reports: source count, accepted, rejected with an individual reason each, duplicate candidates with their positions, and the final count. It then writes accepted numbers to Firestore as `available` using batched writes, with the document ID equal to the number. Re-running is safe: an existing document is left untouched and counted as "already present", never reset — a reseed must not wipe a `sold` number. Support `--dry-run` and `--env`.

**CREATE:** `scripts/seed-numbers.ts`, `docs/reports/seed-run-<timestamp>.md`
**CONSTRAINTS:** Never silently discard a record. The run **fails** if the final count is not 96, unless `--allow-count-mismatch` is passed explicitly. Refuses to run against production without `--confirm-production`. Existing non-`available` numbers are never modified.
**DO NOT:** repair or invent data; report and stop.

**ACCEPTANCE:**
1. Dry run reports without writing.
2. A clean run reports `source=96, accepted=96, rejected=0, duplicates=0, written=96`.
3. A second run reports 96 already present and 0 written.
4. Injecting a duplicate and an invalid entry into a test fixture produces both in the report with reasons.
5. A seeded `sold` number survives a reseed unchanged.

**VERIFY:** Run against the emulator twice; confirm identical final state and correct second-run counts. Run the corrupted-fixture case.
**TESTING:** Integration tests for clean, duplicate, invalid, re-run, and sold-number-preservation cases.
**DOCS:** Commit the report; link it from ADR-008.
**COMMIT:** `feat(data): add idempotent number seed importer with reconciliation report`

---

### B057 — Number availability projection and query
`PHASE: 5 · TYPE: Backend · SIZE: M · DEPS: B056 · PARALLEL: no`

**OBJECTIVE:** Serve numbers to students without exposing inventory internals.

**CONTEXT:** The reference shows ten cards and a "Refresh" control with no pagination or search (contradiction C14), implying a rotating sample of a 96-number pool.

**TASK:** Implement `getAvailableNumbers`: query numbers where status is `available`, **or** status is `reserved` with `reserved_until <= now` (lazy expiry — an expired reservation is available regardless of what the stored status says). Return a randomised sample of 12, with an optional digit-suffix search filter and an optional `exclude` list so "Refresh" returns a different sample. The projection returns only the number, its display form, and availability — never `session_id`, `reserved_until`, or `sold_at`.

**CREATE:** `src/server/operations/get-available-numbers.ts`, `src/app/api/numbers/route.ts`
**CONSTRAINTS:** The projection is enforced at the operation boundary, not by convention. Randomisation must not repeatedly favour the same subset. Rate-limited per IP.
**DO NOT:** return the total pool size if that is commercially sensitive — decide explicitly and record it.

**ACCEPTANCE:** Expired reservations appear as available without the janitor having run; the response contains no internal fields; search filters by suffix; `exclude` produces a different sample; a fixed seed yields reproducible results in tests.
**TESTING:** Emulator tests for lazy expiry, projection leakage (assert absent keys explicitly), search, and sampling distribution over many calls.
**COMMIT:** `feat(numbers): add available number query with lazy expiry`

---

### B058 — Admin number management operations
`PHASE: 5 · TYPE: Backend · SIZE: L · DEPS: B057 · PARALLEL: no`

**TASK:** Implement the trusted operations `adminListNumbers` (filter by status, search, cursor pagination, full field visibility), `adminAddNumbers` (single and bulk paste, normalised, validated, deduplicated against existing, reporting per-entry outcomes), `adminRemoveNumber` (permitted only when `available`), `adminMarkSoldOffline` (permitted from `available` only), and `adminUpdateNumber` (constrained status override with a mandatory reason). Every mutation records audit metadata: actor UID, actor role, action, timestamp, before-state, after-state, reason.

**CREATE:** `src/server/operations/admin/numbers/*.ts`, route handlers under `src/app/api/admin/numbers/`
**CONSTRAINTS:** Transitions are validated against ADR-003 in `src/domain/number-status.ts`, not inline. Removing a `reserved`, `pending`, or `sold` number is refused with a specific message. `SOLD_OFFLINE` from `reserved` is refused — releasing the student's reservation first is an explicit, separate act, because silently overriding a live reservation is exactly the double-booking failure the system exists to prevent. Bulk add is capped (200 per request) and partial success is reported per entry rather than failing the batch.
**ACCEPTANCE:** Every illegal transition is refused with a specific reason; audit metadata is written for every mutation; bulk add reports per-entry outcomes; role checks enforced.
**TESTING:** Emulator tests for each legal and illegal transition, bulk partial success, and audit completeness.
**COMMIT:** `feat(admin): add trusted number management operations`

---

### B059 — Number status domain module
`PHASE: 5 · TYPE: Domain · SIZE: S · DEPS: B058 · PARALLEL: no`

**OBJECTIVE:** Make the lifecycle a data structure rather than scattered conditionals.

**TASK:** Implement the five-state model as an explicit transition table: for each `(from, to)` pair, whether it is permitted, which actor may perform it, and what preconditions apply. Expose `canTransition`, `assertTransition`, `getEffectiveStatus` (applying lazy expiry), and `getAvailableActions(status, role)`.

**CREATE:** `src/domain/number-status.ts`
**CONSTRAINTS:** The table is exhaustive over all 25 pairs — every pair is explicitly permitted or denied, with no implicit default. `getEffectiveStatus` is the single place lazy expiry is computed, imported by both the query path and the reservation path.
**ACCEPTANCE:** All 25 pairs are covered; `getEffectiveStatus` matches ADR-003; `getAvailableActions` respects both role and status.
**TESTING:** Exhaustive unit test over the full 5×5 matrix asserting each cell against ADR-003, plus lazy-expiry boundary cases at exactly `reserved_until`.
**COMMIT:** `feat(domain): add exhaustive number status transition model`

---

### B060 — Phase 5 verification gate
`PHASE: 5 · TYPE: Gate · SIZE: S · DEPS: B055–B059 · PARALLEL: no`

**TASK:** Seed a fresh emulator, run all suites, confirm the reconciliation report matches ADR-008's expected counts, verify no internal field leaks through the public projection, and confirm the transition matrix matches ADR-003 cell for cell.

**ACCEPTANCE:** Clean seed reports 96/96/0/0; public projection leaks nothing; transition matrix matches the ADR exactly; all suites pass.
**VERIFY:** Assert the absence of `session_id`, `reserved_until`, and `sold_at` in the public response payload explicitly, rather than eyeballing it.
**STOP IF:** Seed counts deviate or any internal field leaks.
**COMMIT:** `chore(numbers): close phase 5 inventory gate`
