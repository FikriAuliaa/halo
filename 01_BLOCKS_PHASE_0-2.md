# PART D — CLAUDE CODE BLOCKS · Phases 0–2 (B001–B031)

## SP-1 — Standard preamble (prepend to every block pasted into Claude Code)

```
Before making changes, inspect the current repository state and the relevant files.
Do not assume previous steps were implemented exactly as planned. Adapt safely to the
actual repository.

If the repository state conflicts with this task, do not blindly overwrite working code.
Reconcile the difference, document it in PROJECT_DECISIONS.md, and preserve existing
behaviour unless this task explicitly requires a change.

Git safety: run `git status` and review recent relevant commits first. Do not overwrite
unrelated changes, do not reset the repository, do not delete user work, do not
force-push, and avoid destructive Git commands. Keep the diff focused on this block.
If the working tree is dirty in files this block touches, report what you found and stop
before modifying them.
```

**Field key:** `SIZE` S ≈ under an hour · M ≈ half a day · L ≈ a full day. `PARALLEL: yes` means the block touches no file another concurrently-eligible block touches.

---

# PHASE 0 — DISCOVERY

### B001 — Repository and toolchain audit
`PHASE: 0 · TYPE: Discovery · SIZE: S · DEPS: — · PARALLEL: yes`

**OBJECTIVE:** Establish ground truth about what already exists before anything is written.

**CONTEXT:** The plan assumes a greenfield repository, but the assumption is untested. A pre-existing `package.json`, lockfile, or Firebase config changes several downstream blocks.

**TASK:** Inventory the repository: presence and contents of `package.json`, lockfiles (which package manager), `tsconfig.json`, `next.config.*`, `firebase.json`, `.firebaserc`, `firestore.rules`, `storage.rules`, `.env*`, CI config, existing source directories, and the current Git branch and history depth. Record Node and package-manager versions available in the environment. Produce a written audit.

**INSPECT:** repository root, `.git/`, any `src/` or `app/` directory.
**CREATE:** `docs/reports/repo-audit.md`
**MODIFY:** none

**CONSTRAINTS:** Read-only with respect to source. Do not install dependencies. Do not initialise anything.
**DO NOT:** create a Next.js app, run `npm init`, or modify `.gitignore`.

**ACCEPTANCE:**
1. The audit states, for each expected file, whether it exists and what it contains.
2. Package manager is identified from the lockfile, or explicitly reported as undetermined.
3. Node version in the environment is recorded.
4. Any finding that contradicts this playbook is called out by block ID.

**VERIFY:** Re-read the report against a fresh `ls -la` and `git log --oneline -20`; every claim must be checkable.
**TESTING:** None (discovery).
**DOCS:** The report is the deliverable.
**OUTPUT:** A factual audit with a "contradicts the plan" section.
**STOP IF:** A substantial existing application is found — report it and stop; the playbook needs re-planning against the real repo.
**COMMIT:** `docs(audit): record repository and toolchain baseline`

---

### B002 — Design asset audit and token extraction
`PHASE: 0 · TYPE: Discovery · SIZE: M · DEPS: B001 · PARALLEL: yes`

**OBJECTIVE:** Turn the design ZIP into a precise, written inventory of tokens, components, and states — the raw material for `DESIGN.md`.

**CONTEXT:** Five screens are supplied as `code.html` + `screen.png`, plus `premium_crimson_pulse/DESIGN.md`. The HTML files each embed their own `tailwind.config`, and **those configs disagree with each other** (see the planning document, contradiction C12).

**TASK:** Extract from all five HTML files: the full `tailwind.config` object, every custom CSS rule (gradients, animations, `no-scrollbar`, `card-active`), the class list per component, layout constraints (`max-w-[480px]`, `w-[85vw]`, `snap-x snap-mandatory`, `snap-center`), icon usage (Material Symbols Outlined names), and font loading. Build a comparison table of every token whose value differs between files. View each `screen.png` and describe the rendered result per screen, including states that appear in the screenshot but not in the markup and vice versa.

**INSPECT:** all files under the extracted design directory.
**CREATE:** `docs/reports/design-audit.md`
**MODIFY:** none

**CONSTRAINTS:** Report what is there, including inconsistencies; do not resolve them yet — resolution belongs to B010.
**DO NOT:** copy HTML into the repository as components; do not begin styling work.

**ACCEPTANCE:**
1. Every token name appearing in any config is listed with its value per file.
2. A divergence table names each conflicting token.
3. Each of the five screens has a component inventory and a state inventory.
4. States that the design does **not** cover are listed explicitly (available number card, countdown timer, empty pool, error, loading, desktop, all admin screens).

**VERIFY:** Cross-check three sampled components against the raw HTML by hand.
**TESTING:** None.
**DOCS:** The audit is input to B010.
**OUTPUT:** A design inventory precise enough to build tokens from without reopening the ZIP.
**STOP IF:** The design ZIP is missing or unreadable — visual fidelity is a hard requirement and cannot be guessed.
**COMMIT:** `docs(design): audit supplied design assets and extract tokens`

---

### B003 — Requirement extraction
`PHASE: 0 · TYPE: Discovery · SIZE: M · DEPS: B001 · PARALLEL: yes`

**OBJECTIVE:** Convert the project brief into a numbered, individually-traceable requirement list.

**CONTEXT:** Requirements are currently prose and tables spread across a specification. Traceability (Part F) needs stable IDs.

**TASK:** Read the full specification. Emit requirements as `REQ-###` with: statement, source section, actor, category (functional / business rule / data / security / UX / operational), and a confirmed/assumed/contradicted marker. Cover: student ordering flow, reservation timer, tracking, admin verification, number management, offline sales, status lifecycle, database structure, packages, file storage, and the explicit out-of-scope list.

**INSPECT:** the specification document.
**CREATE:** `docs/reports/requirements.md`
**MODIFY:** none

**CONSTRAINTS:** One requirement per ID; no compound statements. Preserve the original wording as a quoted source line where the phrasing is load-bearing.
**DO NOT:** invent requirements; do not resolve contradictions here.

**ACCEPTANCE:**
1. Every specification section is represented.
2. Out-of-scope items are captured as `REQ-NG-###` (non-goals), not omitted.
3. Each requirement is atomic and testable, or is marked as needing refinement.

**VERIFY:** Walk the specification section by section and confirm no paragraph is unrepresented.
**TESTING:** None.
**DOCS:** Feeds `PRD.md` (B009) and the traceability matrix.
**OUTPUT:** Numbered requirement register.
**STOP IF:** The specification is unavailable.
**COMMIT:** `docs(requirements): extract numbered requirement register`

---

### B004 — Contradiction audit
`PHASE: 0 · TYPE: Discovery · SIZE: M · DEPS: B002, B003 · PARALLEL: no`

**OBJECTIVE:** Independently re-derive the contradiction list rather than inheriting it on trust.

**CONTEXT:** The planning document lists contradictions C1–C20. Some are subtle (the spec contradicts itself about whether a number stays `reserved` or moves to `pending` on submission). This block verifies them and looks for more.

**TASK:** For each contradiction in the planning document, verify it against the primary sources and mark confirmed / not-confirmed / partially-confirmed with evidence. Then scan for contradictions the planner missed, particularly: field-level mismatches between the design's form and the `orders` schema; copy in the design that promises behaviour the spec excludes; ordering or naming mismatches between the package list and `config/packages`. For each confirmed contradiction record: statement, sources in conflict, impact, recommended resolution, and which ADR or block owns it.

**INSPECT:** specification, design HTML, `premium_crimson_pulse/DESIGN.md`, `docs/reports/design-audit.md`, `docs/reports/requirements.md`.
**CREATE:** `docs/reports/contradiction-audit.md`
**MODIFY:** none

**CONSTRAINTS:** Evidence is mandatory — cite the file and the section for both sides of every conflict.
**DO NOT:** resolve contradictions by editing source documents.

**ACCEPTANCE:**
1. Every planner-supplied contradiction has a verdict with evidence.
2. Any new contradiction is added with the same structure.
3. Each confirmed item names its owning ADR or block.
4. Disagreement with the planner is stated plainly where it exists.

**VERIFY:** Sample three verdicts and re-check them from the primary sources.
**TESTING:** None.
**DOCS:** Feeds ADRs and `PRD.md`.
**OUTPUT:** Evidence-backed contradiction register.
**STOP IF:** A contradiction is found that invalidates the architecture (for example, a hard requirement for real-time client Firestore reads).
**COMMIT:** `docs(audit): verify and extend contradiction register`

---

### B005 — Open question register
`PHASE: 0 · TYPE: Discovery · SIZE: S · DEPS: B004 · PARALLEL: no`

**OBJECTIVE:** Separate what genuinely blocks work from what merely needs a default.

**CONTEXT:** Nine open questions are proposed (OQ-1…OQ-9). Misclassifying a non-blocking question as blocking stalls the project; the reverse ships something unsafe.

**TASK:** Build the register with: question, why it matters, recommended default, blocking classification, blocking *for what* (dev / staging / production), owner, and the blocks it gates. Re-examine each classification rather than copying it.

**INSPECT:** `docs/reports/contradiction-audit.md`, specification §12.
**CREATE:** `docs/reports/open-questions.md`
**MODIFY:** none

**CONSTRAINTS:** "Blocking" must name a specific milestone. A question with a safe default is not blocking.
**DO NOT:** leave any question without a recommended default.

**ACCEPTANCE:**
1. Every question has a workable default.
2. Blocking items name the milestone they block and the blocks they gate.
3. No question is left owner-less.

**VERIFY:** Confirm that with every default applied, development can proceed to the end of Phase 13 without external input.
**TESTING:** None.
**DOCS:** Referenced by `PRD.md` and the readiness checklist.
**OUTPUT:** Prioritised open-question register.
**STOP IF:** Something blocks even local development — escalate immediately.
**COMMIT:** `docs(planning): create prioritised open question register`

---

### B006 — Seed data reconciliation analysis (read-only)
`PHASE: 0 · TYPE: Discovery · SIZE: M · DEPS: B003 · PARALLEL: yes`

**OBJECTIVE:** Independently verify the integrity of the 96-number dataset before any importer is written.

**CONTEXT:** The specification reports 100 raw entries, 4 duplicates, 96 clean. It also names the four removed numbers, each of which still appears once in the 96-item table — which is the expected result of deduplication, not evidence of contamination. The planner verified the list is clean. **Verify this independently; do not take it on trust.**

**TASK:** Extract the numbers from the specification's §11 table using an explicit parsing rule. Compute: extracted count, distinct count, duplicate values with positions, invalid entries (must start `08`, length 10–13, digits only after normalisation), and length distribution. Confirm whether each of the four named numbers appears once, more than once, or not at all. Write a reconciliation report with the parsing rule stated, so the numbers are reproducible.

**INSPECT:** specification §11 and §1 summary table.
**CREATE:** `docs/reports/seed-reconciliation.md`, `data/seed/numbers.source.txt` (extracted numbers, one per line, unmodified)
**MODIFY:** none

**CONSTRAINTS:** Report counts even when they match expectations. State the parsing rule explicitly.
**DO NOT:** correct, pad, reorder, or drop any value. Do not write to Firestore.

**ACCEPTANCE:**
1. Report states extracted / distinct / duplicate / invalid / accepted counts.
2. Every rejected record, if any, has an individual reason.
3. The status of the four named numbers is stated explicitly.
4. If the result is `96 / 96 / 0 / 0 / 96`, the report says so plainly rather than manufacturing a problem.

**VERIFY:** Re-run the extraction with a second, independent parsing approach and confirm identical output.
**TESTING:** None yet — the importer's tests come in B053.
**DOCS:** Becomes the baseline for ADR-008.
**OUTPUT:** Reconciliation report + verbatim source list.
**STOP IF:** The extracted count is not 96, or invalid entries appear — stop and report; do not repair.
**COMMIT:** `docs(data): reconcile source number dataset`

---

### B007 — Architecture recommendation memo
`PHASE: 0 · TYPE: Discovery · SIZE: M · DEPS: B001, B004, B005 · PARALLEL: no`

**OBJECTIVE:** Commit to the architecture in writing, with the rejected alternatives recorded.

**CONTEXT:** Part A proposes Next.js Route Handlers as the trusted tier with Cloud Functions reserved for the scheduled janitor. That is a real trade-off and deserves an argued memo, not an assertion.

**TASK:** Write the memo covering: frontend, trusted-tier placement and why, Firestore, Auth and RBAC, Storage, scheduled work, hosting, environments, and the testing approach. For each major decision give at least one rejected alternative and the reason. Explicitly address why correctness does not depend on the scheduled cleanup running.

**INSPECT:** all Phase 0 reports.
**CREATE:** `docs/reports/architecture-recommendation.md`
**MODIFY:** none

**CONSTRAINTS:** No microservices, no event bus, no premature abstraction. Prefer boring and understandable.
**DO NOT:** scaffold anything; this is still a written deliverable.

**ACCEPTANCE:**
1. Each decision has a rationale and a named rejected alternative.
2. The reservation concurrency approach is described precisely enough to implement from.
3. Host-portability constraints are stated (no host-specific APIs).

**VERIFY:** Check every Phase 0 finding is either addressed or explicitly deferred.
**TESTING:** None.
**DOCS:** Becomes ADR-001.
**OUTPUT:** Argued architecture memo.
**STOP IF:** A Phase 0 finding makes the recommended stack unworkable.
**COMMIT:** `docs(architecture): record architecture recommendation and rejected alternatives`

---

### B008 — Phase 0 verification gate
`PHASE: 0 · TYPE: Gate · SIZE: S · DEPS: B001–B007 · PARALLEL: no`

**OBJECTIVE:** Confirm discovery is complete before documentation begins.

**TASK:** Verify all seven reports exist and are internally consistent; confirm no contradiction is unassigned and no open question lacks a default; produce a one-page summary of what is known, assumed, and unknown.

**CREATE:** `docs/reports/phase-0-summary.md`
**ACCEPTANCE:** All reports present; every contradiction owned; every question defaulted; summary distinguishes known from assumed.
**VERIFY:** Read all seven reports end to end; list any conflicts between them.
**STOP IF:** Any report is missing or two reports disagree.
**COMMIT:** `docs(planning): close phase 0 discovery gate`

---

# PHASE 1 — PRODUCT DOCUMENTATION

### B009 — Documentation scaffold and decision register
`PHASE: 1 · TYPE: Docs · SIZE: S · DEPS: B008 · PARALLEL: no`

**OBJECTIVE:** Create the documentation skeleton and the running decision register.

**TASK:** Create `docs/`, `docs/adr/`, `docs/reports/`; add an ADR template (`docs/adr/000-template.md`) using context / decision / status / consequences / alternatives; create `PROJECT_DECISIONS.md` as a dated table (date, decision, rationale, source block, reversible?); create a `docs/README.md` index explaining which document answers which question.

**CREATE:** `docs/adr/000-template.md`, `PROJECT_DECISIONS.md`, `docs/README.md`
**CONSTRAINTS:** ADR template must force alternatives to be recorded.
**ACCEPTANCE:** Directories exist; template is complete; register has its first entries from Phase 0; index maps question → document.
**VERIFY:** Every planned document from Part C is either present or listed as pending in the index.
**COMMIT:** `docs(structure): scaffold documentation and decision register`

---

### B010 — Write `DESIGN.md`
`PHASE: 1 · TYPE: Docs · SIZE: L · DEPS: B009, B002 · PARALLEL: yes`

**OBJECTIVE:** Turn the design reference into an implementable specification that resolves the token conflicts.

**CONTEXT:** The supplied `premium_crimson_pulse/DESIGN.md` is a style description; this is its engineering counterpart. Token divergence (C12) and radius inconsistency (C13) must be resolved here, once, so no component has to decide.

**TASK:** Write `DESIGN.md` covering brand personality; the canonical colour token set with semantic roles; purpose-named additions (`card-gradient-start`, `divider`, `brand-red`, `highlight-orange`) and why they exist; typography scale with font loading strategy; the 4 px spacing system; the explicit radius scale with per-component assignments; gradient and elevation rules; interaction, selection, error, loading, empty, and disabled states; iconography; buttons, inputs, cards, chips, badges, progress/timer, modal, toast, uploader; responsive behaviour at 480 / 768 / 1024 px; contrast requirements; animation and reduced-motion principles; and do/don't rules with examples.

Three sections are mandatory and must be separated: **Source-derived** (traceable to the ZIP), **Implementation decisions** (added for usability — desktop layout, search, timer, admin density), **Assumptions**.

**INSPECT:** design ZIP, `docs/reports/design-audit.md`, `docs/reports/contradiction-audit.md`.
**CREATE:** `DESIGN.md`
**CONSTRAINTS:** Every colour pair used for text must have its measured contrast ratio recorded. The countdown timer, the available/selected number card states, and the desktop layout must be specified here because the reference does not contain them.
**DO NOT:** introduce a generic SaaS dashboard aesthetic; do not silently drop a token that appears in the reference.

**ACCEPTANCE:**
1. Every token from the canonical source is present with a semantic role.
2. Token conflicts are resolved with the resolution stated.
3. The three provenance sections are clearly separated.
4. Contrast ratios are recorded for all text/background pairs, with any pair below 4.5:1 flagged with its remediation.
5. Timer, number-card states, and responsive behaviour are specified.

**VERIFY:** Compute contrast ratios and confirm the recorded values. Confirm every component visible in the five screenshots appears in the document.
**DOCS:** This is the deliverable.
**STOP IF:** A required token has no defensible canonical value.
**COMMIT:** `docs(design): specify implementation-oriented design system`

---

### B011 — Write `AGENTS.md`
`PHASE: 1 · TYPE: Docs · SIZE: M · DEPS: B009 · PARALLEL: yes`

**OBJECTIVE:** Give future coding agents the rules that keep this repository safe.

**CONTEXT:** Generic agent boilerplate is worthless. This file must contain the constraints that are specific to *this* system and expensive to violate.

**TASK:** Write `AGENTS.md`: repository purpose; architecture overview in ten lines; directory map with the purpose of each; naming and coding conventions; state-management conventions; the rule that all mutations go through trusted server operations; Firestore and Storage rules conventions; testing expectations per change type; accessibility expectations; visual-fidelity expectations referencing `DESIGN.md`; security constraints; how to run the project and the emulators; how to run each test suite; how to validate a change before committing; commit conventions; when an ADR is required; when documentation must be updated in the same commit.

Include an explicit **prohibited patterns** section: no Firebase client SDK writes; no client-side enforcement of a server rule; no business logic inside a component; no `any` without a justifying comment; no `localStorage` as a source of truth for reservation state; no secrets in source or in `NEXT_PUBLIC_*`; no host-specific APIs; no hardcoded prices, TTLs, or university lists; no public Storage URLs for proofs; no admin route without a server-side role check.

**CREATE:** `AGENTS.md`
**ACCEPTANCE:** Every prohibition is stated with its reason. Commands are real and runnable. The ADR trigger list is concrete.
**VERIFY:** Have a reader answer "may I write to Firestore from a client component?" using only this file.
**STOP IF:** Conventions conflict with `docs/reports/architecture-recommendation.md`.
**COMMIT:** `docs(agents): define coding agent operating rules`

---

### B012 — Write `PRD.md`
`PHASE: 1 · TYPE: Docs · SIZE: L · DEPS: B009, B003, B004, B005 · PARALLEL: yes`

**OBJECTIVE:** Consolidate requirements into a product document with testable acceptance criteria.

**TASK:** Write `PRD.md`: executive summary; background; problem statement (uncoordinated online and offline channels causing double-selling); goals; non-goals from the spec's out-of-scope list; users (student, Admin Kampus, Admin Telkomsel); user journeys for each; functional requirements referencing `REQ-###`; business rules; the five-state status lifecycle; acceptance criteria in given/when/then form; edge cases; error handling; observability; security considerations; success metrics (zero double-sales being the headline); risks; assumptions A1–A7; open questions; scope boundaries.

**CREATE:** `PRD.md`
**CONSTRAINTS:** Anything not in the source is marked `ASSUMPTION` or `PROPOSED`. Confirmed and inferred requirements must never be presented alike.
**DO NOT:** invent business requirements and label them confirmed.
**ACCEPTANCE:** Every `REQ-###` is represented or explicitly deferred; every functional requirement has at least one acceptance criterion; the lifecycle matches ADR-003.
**VERIFY:** Cross-check against `docs/reports/requirements.md` for unrepresented IDs.
**COMMIT:** `docs(prd): write product requirements document`

---

### B013 — Write `ARCHITECTURE.md`
`PHASE: 1 · TYPE: Docs · SIZE: L · DEPS: B009, B007 · PARALLEL: yes`

**OBJECTIVE:** Document the system structure and its critical flows.

**TASK:** Write `ARCHITECTURE.md`: component overview; frontend structure and server/client boundary policy; the trusted tier and what qualifies an operation as trusted; Firestore usage; Auth and custom claims; Storage topology; the scheduled function; configuration and environment variables; the public/private data boundary; and Mermaid sequence diagrams for **reservation**, **order submission with upload**, **admin verification**, **tracking lookup**, and **expiry cleanup**. Add a deployment topology diagram, a rollback description, and an observability section.

**CREATE:** `ARCHITECTURE.md`
**CONSTRAINTS:** Diagrams must show where the trust boundary is crossed. State explicitly that lazy expiry is authoritative and the cron is hygiene.
**ACCEPTANCE:** Five sequence diagrams render; every trusted operation appears in at least one; the trust boundary is visible in each.
**VERIFY:** Render the Mermaid; trace one request end to end against the diagram.
**COMMIT:** `docs(architecture): document system structure and critical flows`

---

### B014 — Write `DATA_MODEL.md`
`PHASE: 1 · TYPE: Docs · SIZE: M · DEPS: B009, B013 · PARALLEL: no`

**OBJECTIVE:** Specify collections, fields, indexes, and invariants precisely enough to implement without guessing.

**TASK:** Document `numbers`, `orders`, `config/{payment,packages,universities,system}`, plus any auxiliary collection needed for idempotency, rate limiting, and audit. For every field: name, type, nullability, constraints, who writes it, and when. Specify document ID strategies (`numbers` keyed by the phone number; `orders` keyed by a generated ID with `order_ref` indexed). List required composite indexes with the query each serves. State invariants formally, including the core one-owner rule. Mark every field added beyond the spec as an addition, with its justification.

**CREATE:** `DATA_MODEL.md`
**CONSTRAINTS:** Timestamps are server-generated only. Every addition beyond the source schema is justified in writing.
**ACCEPTANCE:** All collections documented; additions marked and justified; indexes mapped to queries; invariants stated as checkable propositions.
**VERIFY:** Walk each planned query and confirm an index exists for it.
**COMMIT:** `docs(data-model): specify collections, indexes and invariants`

---

### B015 — Write `API_SPEC.md`
`PHASE: 1 · TYPE: Docs · SIZE: L · DEPS: B009, B014 · PARALLEL: no`

**OBJECTIVE:** Define every trusted operation as a contract before any is implemented.

**TASK:** For each of `getAvailableNumbers`, `reserveNumber`, `validateReservation`, `releaseReservation`, `submitOrder`, `getTrackingStatus`, `adminListOrders`, `adminGetOrder`, `adminGetProofUrl`, `adminVerifyPayment`, `adminRejectPayment`, `adminListNumbers`, `adminAddNumbers`, `adminRemoveNumber`, `adminMarkSoldOffline`, `adminUpdateNumber`, `adminManagePackages`, `adminManageUniversities`, `adminUpdatePaymentConfig`, `cleanupExpiredReservations`: specify HTTP method and path, auth requirement, required role, request schema, response schema, every error code with HTTP status and user-facing message, idempotency behaviour, rate limit, and side effects on `numbers` and `orders`.

Define a single error envelope: stable machine `code`, safe human `message`, optional `field`. Enumerate the codes centrally (`NUMBER_UNAVAILABLE`, `RESERVATION_EXPIRED`, `RESERVATION_NOT_FOUND`, `SESSION_MISMATCH`, `INVALID_FILE_TYPE`, `FILE_TOO_LARGE`, `VALIDATION_FAILED`, `NOT_FOUND`, `FORBIDDEN`, `RATE_LIMITED`, `CONFLICT`, `INTERNAL`).

**CREATE:** `API_SPEC.md`
**CONSTRAINTS:** Error messages must never leak internal state — "this number is no longer available" rather than a Firestore error. Every mutating operation must state its idempotency behaviour.
**ACCEPTANCE:** All twenty operations specified; error codes centrally enumerated; idempotency stated for every mutation; role requirements explicit.
**VERIFY:** Confirm every `PRD.md` business rule maps to at least one operation.
**COMMIT:** `docs(api): specify trusted server operation contracts`

---

### B016 — Write `SECURITY.md`
`PHASE: 1 · TYPE: Docs · SIZE: M · DEPS: B015 · PARALLEL: no`

**OBJECTIVE:** Document the security model, controls, and threat mitigations.

**TASK:** Cover admin authentication and RBAC; Firestore and Storage rules philosophy (deny-by-default, since all access is server-mediated); input validation at both tiers; upload security including the re-encode rationale; the tracking token model and why only its hash is stored; secret management; XSS and CSRF posture; rate limiting; App Check; audit fields; least privilege; PII inventory and minimisation; log redaction; and secure error messaging. Include the threat model table (Part H) with mitigation and verification per threat.

**CREATE:** `SECURITY.md`
**CONSTRAINTS:** Each control names the block that implements it and the test that proves it.
**ACCEPTANCE:** PII inventory complete (name, phone, email, university, proof image); every threat has mitigation + verification; every control is traceable to a block.
**VERIFY:** Cross-check each threat against `API_SPEC.md` for an enforcement point.
**COMMIT:** `docs(security): document threat model and security controls`

---

### B017 — Write `TEST_PLAN.md`
`PHASE: 1 · TYPE: Docs · SIZE: M · DEPS: B015 · PARALLEL: yes`

**OBJECTIVE:** Define the testing strategy, including the concurrency suite that justifies trust in the system.

**TASK:** Define the pyramid: unit (validators, formatters, state transitions, price calculation, expiry logic); integration on emulators (repositories, trusted operations, auth, storage, rules); concurrency (competing reservations, expiry races, duplicate submission); E2E (scenarios A–L from master prompt §45); accessibility; visual regression. For each layer: tooling, location, naming, what belongs there, and what must not. Specify coverage expectations by area — high for domain logic, pragmatic for UI. Define how flaky tests are handled: quarantine with an owner and a deadline, never silent skip.

**CREATE:** `TEST_PLAN.md`
**ACCEPTANCE:** All twelve E2E scenarios listed with preconditions and assertions; concurrency scenarios named individually; coverage expectations differentiated by area.
**VERIFY:** Confirm every business rule in `PRD.md` has at least one named test.
**COMMIT:** `docs(testing): define test strategy and scenario catalogue`

---

### B018 — Write `DEPLOYMENT.md`
`PHASE: 1 · TYPE: Docs · SIZE: M · DEPS: B013 · PARALLEL: yes`

**TASK:** Document the three environments and their Firebase projects; every environment variable with purpose, example, and whether it is public; secret handling via Secret Manager; the build and deploy sequence for app, rules, indexes, and functions; the pre-deploy checklist; smoke tests; the rollback procedure for each artefact (app, rules, indexes, functions — noting that rules and index rollbacks behave differently from app rollbacks); and the first-deploy bootstrap sequence including admin creation and seeding.

**CREATE:** `DEPLOYMENT.md`, `.env.example`
**CONSTRAINTS:** No real secret value appears anywhere. Every `NEXT_PUBLIC_*` variable is justified as safe to expose.
**ACCEPTANCE:** Every variable documented; rollback covers all four artefact types; bootstrap ordering is explicit.
**VERIFY:** Confirm `.env.example` matches every variable referenced in the documentation.
**COMMIT:** `docs(deployment): document environments, secrets and release process`

---

### B019 — Write `OPERATIONS.md` and `RUNBOOK.md`
`PHASE: 1 · TYPE: Docs · SIZE: M · DEPS: B018 · PARALLEL: yes`

**TASK:** `OPERATIONS.md`: daily admin routine, the offline-sales recap procedure, monitoring signals, alert thresholds, health checks, capacity notes, and backup/export expectations. `RUNBOOK.md`: step-by-step procedures for stuck reservations, a failed cleanup job, a wrongly-verified order, an unreadable proof, a lost tracking token, an unreachable Firestore, a compromised admin account, a QRIS image update, an emergency inventory freeze, and a bulk offline-sales import.

**CREATE:** `OPERATIONS.md`, `RUNBOOK.md`
**CONSTRAINTS:** Every runbook entry states detection, immediate action, resolution, and follow-up. "Lost tracking token" must state honestly that the token is unrecoverable and describe the admin-mediated alternative.
**ACCEPTANCE:** Ten runbook procedures present, each with the four sections; the daily routine is concrete enough to hand to a non-engineer.
**COMMIT:** `docs(operations): write operations guide and incident runbook`

---

### B020 — ADR-001 stack, ADR-002 admin authentication
`PHASE: 1 · TYPE: Docs · SIZE: M · DEPS: B009, B007 · PARALLEL: yes`

**TASK:** ADR-001 formalises the stack from the recommendation memo, with Vercel-vs-App-Hosting and callable-Functions-vs-Route-Handlers recorded as rejected alternatives. ADR-002 decides Firebase Auth with custom claims, covering bootstrap, role assignment, protected routes, server-side authorization, client UX guards, logout, unauthorized handling, session lifetime, and auditability — and explicitly records the rejection of the obscure-URL model.

**CREATE:** `docs/adr/001-architecture-stack.md`, `docs/adr/002-admin-authentication.md`
**ACCEPTANCE:** Both follow the template; both name rejected alternatives with reasons; ADR-002 covers the full bootstrap sequence.
**COMMIT:** `docs(adr): record stack and admin authentication decisions`

---

### B021 — ADR-003 status lifecycle, ADR-004 reservation concurrency
`PHASE: 1 · TYPE: Docs · SIZE: M · DEPS: B020 · PARALLEL: no`

**OBJECTIVE:** Formalise the two decisions the entire system rests on.

**TASK:** ADR-003: the five-state model, permitted transitions as a table, the actor authorised for each, and resolution of the spec's internal contradiction (C11 — a submitted order moves the number to `pending`, and why the alternative reading is unsafe). ADR-004: single-document Firestore transactions, server-authoritative timestamps, the guard predicate evaluated inside the transaction, retry semantics, lazy expiry as authoritative with the cron as hygiene, idempotency keys, and the formal invariant. Include a state diagram.

**CREATE:** `docs/adr/003-number-status-lifecycle.md`, `docs/adr/004-reservation-concurrency.md`
**CONSTRAINTS:** Every transition names its authorised actor and trigger. Illegal transitions are listed explicitly, not left implied.
**ACCEPTANCE:** Transition table complete for all five states; the invariant is stated formally; the "cron is not load-bearing" property is argued, not asserted.
**VERIFY:** Trace each of the twelve E2E scenarios through the state diagram; every one must terminate in a legal state.
**COMMIT:** `docs(adr): formalise status lifecycle and reservation concurrency model`

---

### B022 — ADR-005 tracking, ADR-006 proof storage, ADR-007 offline sales
`PHASE: 1 · TYPE: Docs · SIZE: M · DEPS: B021 · PARALLEL: no`

**TASK:** ADR-005: opaque `order_ref` format and alphabet, the 32-byte token, hash-only storage, the minting-at-reservation decision driven by the payment screen's visible `Kode Pemesanan`, the lookup contract, rate limiting, and the explicit rejection of email/WhatsApp-only tracking. ADR-006: private bucket, path convention, server-mediated upload, magic-byte plus re-encode validation, signed-URL viewing, and the 90-day retention default. ADR-007: `SOLD_OFFLINE` semantics, who may set it, whether it is reversible, and how the daily recap is reconciled.

**CREATE:** `docs/adr/005-student-order-tracking.md`, `docs/adr/006-payment-proof-storage.md`, `docs/adr/007-offline-sales-status.md`
**ACCEPTANCE:** ADR-005 states plainly that a lost token is unrecoverable and gives the admin-mediated fallback; ADR-006 justifies re-encoding over sniffing alone; ADR-007 answers reversibility unambiguously.
**COMMIT:** `docs(adr): record tracking, proof storage and offline sales decisions`

---

### B023 — ADR-008 seed reconciliation, ADR-009 environments, ADR-010 observability
`PHASE: 1 · TYPE: Docs · SIZE: S · DEPS: B022 · PARALLEL: yes`

**TASK:** ADR-008: normalisation rules, validation rules, deduplication policy, idempotent re-run behaviour, mandatory reporting, and the finding that the source dataset is clean — with the standing rule that any deviation from `96/96/0/0/96` fails the run. ADR-009: three environments, project-per-environment, promotion path, and data-handling rules per environment. ADR-010: structured log schema, correlation IDs, the event list, audit fields, and redaction rules.

**CREATE:** `docs/adr/008-seed-data-reconciliation.md`, `docs/adr/009-environment-strategy.md`, `docs/adr/010-observability-and-audit.md`
**ACCEPTANCE:** ADR-008 defines exact expected counts; ADR-010's log schema names every field and marks which are redacted.
**COMMIT:** `docs(adr): record seeding, environment and observability decisions`

---

### B024 — Write `README.md`
`PHASE: 1 · TYPE: Docs · SIZE: S · DEPS: B009–B023 · PARALLEL: no`

**TASK:** Purpose in three sentences; the problem it solves; quickstart (prerequisites, install, emulators, seed, run); script index; project structure; where to find each document; contribution basics; the current status and known limitations.

**CREATE:** `README.md`
**CONSTRAINTS:** Quickstart must be executable by someone who has never seen the project.
**ACCEPTANCE:** Every command listed exists or is marked pending; every Part C document is linked.
**COMMIT:** `docs(readme): write project orientation and quickstart`

---

### B025 — Phase 1 verification gate
`PHASE: 1 · TYPE: Gate · SIZE: S · DEPS: B024 · PARALLEL: no`

**TASK:** Confirm every Part C document exists; check cross-document consistency (status names, field names, error codes, operation names must be identical everywhere); verify every ADR has a status; confirm `PROJECT_DECISIONS.md` captures each decision; record discrepancies and fix them.

**ACCEPTANCE:** No status, field, or operation name differs between documents; all ten ADRs accepted; no unresolved TODO outside the open-question register.
**VERIFY:** Grep each status value, each error code, and each operation name across `docs/` and confirm consistent spelling and casing.
**STOP IF:** Two documents specify contradictory behaviour — resolve before any code is written.
**COMMIT:** `docs(planning): close phase 1 documentation gate`

---

# PHASE 2 — REPOSITORY BOOTSTRAP

### B026 — Next.js project bootstrap
`PHASE: 2 · TYPE: Setup · SIZE: M · DEPS: B025 · PARALLEL: no`

**OBJECTIVE:** Create the application skeleton with strict TypeScript and the documented directory conventions.

**TASK:** Initialise Next.js 15 with App Router, TypeScript, and the `src/` directory, using the package manager identified in B001 (default pnpm if undetermined). Configure `tsconfig.json` with `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes`, and the `@/*` path alias. Create the directory structure from `AGENTS.md`: `src/app/(student)`, `src/app/(admin)`, `src/app/api`, `src/components/ui`, `src/components/student`, `src/components/admin`, `src/domain`, `src/server`, `src/lib`, `src/schemas`, each with a `README.md` stating its purpose and what may not go in it. Remove all starter boilerplate and demo styles.

**ACCEPTANCE:** `tsc --noEmit` and `next build` both pass on an empty app; strict flags enabled; no starter boilerplate remains; every directory has a purpose README.
**VERIFY:** Run typecheck and build; confirm no `.tsx` from the template survives.
**STOP IF:** The Node version cannot support Next.js 15.
**COMMIT:** `chore(setup): bootstrap Next.js application with strict TypeScript`

---

### B027 — Linting, formatting, and Git hooks
`PHASE: 2 · TYPE: Setup · SIZE: S · DEPS: B026 · PARALLEL: no`

**TASK:** Configure ESLint (Next.js core-web-vitals + `@typescript-eslint` strict + `jsx-a11y`) and Prettier with the Tailwind class-sorting plugin. Add custom rules enforcing `AGENTS.md` prohibitions: ban `firebase/firestore` imports outside `src/lib/firebase-client.ts`, ban `any` without an eslint-disable carrying a reason, ban `console.log` in `src/server`. Add Husky + lint-staged running lint and format on staged files, and a commit-msg hook validating Conventional Commits.

**CONSTRAINTS:** Hooks must be fast — typecheck and tests belong in CI, not in the pre-commit hook. A slow hook gets bypassed, which is worse than no hook.
**ACCEPTANCE:** `lint` and `format:check` scripts pass; the import ban triggers on a deliberate violation; a malformed commit message is rejected.
**VERIFY:** Deliberately violate each custom rule and confirm the failure, then revert.
**COMMIT:** `chore(tooling): configure linting, formatting and git hooks`

---

### B028 — Testing infrastructure
`PHASE: 2 · TYPE: Setup · SIZE: M · DEPS: B026 · PARALLEL: yes`

**TASK:** Install and configure Vitest with `@testing-library/react` and jsdom for component tests, a separate Node-environment project for server tests, and coverage via v8. Install Playwright with mobile (390×844) and desktop (1440×900) projects, plus `@axe-core/playwright`. Add scripts: `test`, `test:unit`, `test:integration`, `test:e2e`, `test:a11y`, `test:coverage`. Add one trivial passing test per layer to prove the wiring.

**ACCEPTANCE:** Every script runs and passes; coverage report generates; Playwright browsers install; unit and integration environments are genuinely separate.
**VERIFY:** Run each script; confirm the smoke tests execute in the expected environment.
**COMMIT:** `chore(testing): configure vitest and playwright infrastructure`

---

### B029 — Firebase project configuration and emulator suite
`PHASE: 2 · TYPE: Setup · SIZE: M · DEPS: B026 · PARALLEL: no`

**TASK:** Add `firebase.json` configuring Firestore, Storage, Auth, and Functions emulators on fixed ports plus the Emulator UI. Create `.firebaserc` with dev/staging/prod aliases. Create placeholder `firestore.rules` and `storage.rules` that **deny all access** — the permissive default is a footgun and the real rules arrive in B049 and B074. Add `firestore.indexes.json`. Add `src/lib/firebase-admin.ts` initialising the Admin SDK with emulator detection. Add scripts `emulators`, `emulators:export`, `emulators:import`.

**CONSTRAINTS:** Deny-all is the starting posture. No service account key is committed; local development uses emulators, deployed environments use Application Default Credentials.
**ACCEPTANCE:** Emulators start; UI is reachable; Admin SDK connects to the emulator when `FIRESTORE_EMULATOR_HOST` is set; rules deny an unauthenticated read.
**VERIFY:** Start emulators, attempt a client read, confirm it is denied.
**STOP IF:** A service account key file is found in the repository — stop and report it as a security finding.
**COMMIT:** `chore(firebase): configure project aliases and local emulator suite`

---

### B030 — Environment configuration and shared utilities
`PHASE: 2 · TYPE: Setup · SIZE: M · DEPS: B026 · PARALLEL: no`

**TASK:** Create `src/lib/env.ts` validating all environment variables with Zod at module load, separating server-only from `NEXT_PUBLIC_*` and failing fast with a readable message naming the missing variable. Create shared utilities with unit tests: `src/lib/errors.ts` (typed `AppError` with the error codes from `API_SPEC.md`), `src/lib/result.ts` (a discriminated-union `Result` type for operations that fail expectedly), `src/lib/time.ts` (server-time helpers), `src/lib/id.ts` (CSPRNG-backed `order_ref` and token generation using the Crockford alphabet), `src/lib/format.ts` (phone display, currency `Rp 100.000`, date formatting in `Asia/Jakarta`).

**CONSTRAINTS:** No `Math.random()` anywhere in `id.ts`. Currency and date formatting use `Intl` with the `id-ID` locale. Env validation must run before any Firebase initialisation.
**ACCEPTANCE:** Missing env vars fail at startup with a named message; `order_ref` matches `^HALO-[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{9}$`; formatters have unit tests including edge cases.
**VERIFY:** Unset a required variable and confirm a clear startup failure; generate 10,000 refs and assert no collision and full alphabet compliance.
**COMMIT:** `feat(lib): add environment validation and shared utilities`

---

### B031 — Phase 2 verification gate
`PHASE: 2 · TYPE: Gate · SIZE: S · DEPS: B026–B030 · PARALLEL: no`

**TASK:** Run lint, typecheck, unit tests, and build. Start the emulators and confirm connectivity. Review the diff for stray boilerplate. Confirm `.gitignore` covers `.env*`, service account keys, `.next`, coverage, and emulator exports. Update `README.md` with any command that changed.

**ACCEPTANCE:** All checks pass; emulators start cleanly; no secret or key is tracked by Git; README commands are accurate.
**VERIFY:** `git ls-files | grep -iE 'serviceaccount|\.env$|\.pem$'` returns nothing.
**STOP IF:** Any check fails — do not proceed to Phase 3.
**COMMIT:** `chore(setup): close phase 2 bootstrap gate`
