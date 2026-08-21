# Telkomsel Halo Number Ordering System — Execution Playbook

**Role of this document:** planning output only. No application code is produced here. The implementation agent is Claude Code; this playbook is the sequence of prompts it will execute.

## Source materials inspected

| Source | Status |
|---|---|
| `KONTEKS_PROYEK_KARTU_HALO_DAN_PAKET.md` (+ .docx) | Read in full, including the 96-number table and open-items register |
| `Master_Prompt___Claude_Planner...md` | Read in full |
| `stitch_telkomsel_halo_number_claim_ui.zip` | Extracted; all 5 `code.html` files parsed, `premium_crimson_pulse/DESIGN.md` read, screenshots enumerated |

## Playbook file map

| File | Contents |
|---|---|
| `00_EXECUTION_PLAN.md` | Part A (architecture), Part B (reconciliation), Part C (documentation plan) |
| `01_BLOCKS_PHASE_0-2.md` | B001–B031 — discovery, documentation, repository bootstrap |
| `02_BLOCKS_PHASE_3-5.md` | B032–B060 — design system, backend foundation, inventory |
| `03_BLOCKS_PHASE_6-9.md` | B061–B092 — reservation engine, student ordering, payment, tracking |
| `04_BLOCKS_PHASE_10-13.md` | B093–B112 — admin auth, dashboard, inventory admin, configuration |
| `05_BLOCKS_PHASE_14-17.md` | B113–B140 — hardening, testing, operations, final QA |
| `06_MATRICES.md` | Part E (dependency graph), F (traceability), G (failure modes), H (threat model + UI state matrix), I (execution order) |

---

## PART A — EXECUTIVE ARCHITECTURE DECISION

### A.1 Recommended stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15, App Router, TypeScript strict | Server/client boundary is the mechanism that keeps inventory mutation off the client; App Router gives it natively |
| Styling | Tailwind CSS v3.4 + design-token config | The supplied HTML ships a working `tailwind.config` object in v3 syntax. Porting it verbatim is the lowest-risk path to visual fidelity. v4's CSS-first config would require a translation step that invites drift |
| UI primitives | Radix UI primitives only where accessibility is hard (Dialog, Select, Popover) | Avoids a component library whose opinions fight the Crimson Pulse look; Radix ships behaviour, not styling |
| Validation | Zod, shared schema module used by both client and server | One definition, two enforcement points; server enforcement is authoritative |
| Database | Cloud Firestore (Native mode) | Matches the NoSQL requirement; document-level transactions are exactly the primitive the reservation problem needs |
| Auth | Firebase Authentication (email/password), admins only | Students stay login-free per spec §4 |
| Authorization | Custom claims `role: ADMIN_KAMPUS \| ADMIN_TELKOMSEL`, verified server-side on every request | No obscure-URL admin model (master prompt §6) |
| File storage | Cloud Storage, private bucket, no public rules | Payment proofs contain financial PII |
| Scheduled work | Cloud Functions (2nd gen, Node 20) + Cloud Scheduler | Only used for janitorial cleanup — see A.3 |
| Testing | Vitest (unit), Firebase Emulator Suite (integration + rules), Playwright (E2E, a11y via `@axe-core/playwright`, visual snapshots) | |
| Hosting | Firebase App Hosting | Keeps app, data, auth, storage, and Secret Manager in one project and one IAM boundary. Vercel is the rejected alternative, recorded in ADR-001 |

### A.2 Where trusted logic lives

**Decision:** Next.js Route Handlers running on the Node runtime, using `firebase-admin`, are the trusted tier. Cloud Functions are used only for the scheduled reservation janitor.

**Rationale:** a callable-Functions tier would add a second deployment artefact, a second cold-start profile, and a second place for business rules to live, for no additional safety — a Route Handler executing with a service account is exactly as server-authoritative as a callable Function. Fewer places for the reservation invariant to hide is a security property, not just a convenience.

**Consequences, recorded so they are not discovered late:**
- The app cannot be statically exported. App Hosting/Node runtime is mandatory.
- The Firebase client SDK is never used for writes anywhere in the codebase. The client reads nothing from Firestore directly either; every read goes through a Route Handler that returns a projection. This makes the security rules a defence-in-depth backstop rather than the primary control — and it means the rules can be written as near-total denial.

### A.3 Reservation authority (the load-bearing decision)

Two mechanisms, deliberately layered:

1. **Lazy expiry is authoritative.** Any read or transaction that touches a number treats `status === 'reserved' && reserved_until <= serverTime` as available. Correctness never depends on a cron job having run.
2. **The scheduled janitor is hygiene.** A Cloud Function every 2 minutes rewrites expired reservations back to `available` so the stored data matches reality, admin counts are honest, and indexes stay useful.

If the janitor is down for a day, the system stays correct and merely looks untidy in the admin dashboard. This is the property to protect.

The reservation write itself is a Firestore transaction on the single `numbers/{numberId}` document, with the guard evaluated inside the transaction against `Timestamp.now()` taken server-side. Two concurrent reservers of the same number: one transaction commits, the other retries, re-reads `status === 'reserved'` with a live `reserved_until`, and fails cleanly with `NUMBER_UNAVAILABLE`.

### A.4 Identity and reference minting

The payment screen in the design displays `Kode Pemesanan HALO-ABC123XYZ` with a copy button — before the order has been submitted. That single detail sets the identity model:

- `orderRef` and the tracking secret are minted **at reservation time**, not at submission.
- `orderRef`: `HALO-` + 9 chars of Crockford base32 (excludes I, L, O, U), generated from a CSPRNG. Not sequential.
- `trackingToken`: 32 random bytes, base64url. Only `sha256(token)` is persisted. The plaintext exists in the response body and in the student's confirmation screen; the server can never re-issue it.
- `sessionId`: opaque CSPRNG value in an `httpOnly`, `SameSite=Lax`, `Secure` cookie. The client never reads or constructs it (master prompt §9 forbids trusting client-side session IDs).

### A.5 Payment proof pipeline

Students are unauthenticated, so they cannot be given Storage write credentials. Uploads go through the server:

```
client → POST /api/orders/submit (multipart) → Route Handler → validate → sharp re-encode → admin SDK → private bucket
```

The re-encode step is the security control that matters: decoding and re-emitting the image with `sharp` strips EXIF (which routinely carries GPS), and destroys polyglot files whose bytes are simultaneously a valid JPEG and a valid script. Extension checking alone is theatre; magic-byte sniffing alone is better but still passes polyglots.

Admin viewing uses a short-lived (5 min) signed URL minted per request after the role check. No object is ever publicly readable.

### A.6 Environments

`dev` (emulators, seeded fixtures) → `staging` (real Firebase project, scrubbed data) → `prod`. Separate Firebase projects, never separate collections in one project. Secrets in Secret Manager, surfaced via App Hosting environment config; `.env.local` is gitignored and a committed `.env.example` documents every key.

### A.7 Testing strategy summary

The test pyramid is deliberately top-heavy in one unusual place: concurrency. Ordinary CRUD gets ordinary coverage, but the reservation engine gets a dedicated emulator-backed suite that fires genuinely parallel requests and asserts the invariant. That suite is the reason to trust the system.

**Core invariant** (asserted by test, not by review): at any instant, at most one non-expired reservation or non-rejected order may reference a given number.

---

## PART B — REQUIREMENT RECONCILIATION

### B.1 Confirmed requirements

Carried forward unchanged from the specification: serverless architecture; NoSQL data model; no student login; single static QRIS; manual admin verification; payment-proof image upload; reservation timer as the anti-double-booking mechanism; automatic expiration; five package tiers (70/120/160/220/300 GB) with IDs `pkg_70gb`…`pkg_300gb`; order form fields name / university / WhatsApp / email; proof formats JPG, PNG, WEBP at max 5 MB; three collections `numbers`, `orders`, `config`; two admin roles; offline sales must be recordable.

### B.2 Contradictions found, and recommended resolutions

**C1 — Seed data: the master prompt's premise is incorrect (verified)**

Master prompt §4 asserts the visible 96-number list "appears to still contain entries identified elsewhere as duplicates." Programmatic check of the extracted list:

| Check | Result |
|---|---|
| Entries extracted from §11 table | 96 |
| Distinct values | 96 |
| Duplicates within the list | none |
| All start `08` | yes |
| Length distribution | 96 × 12 digits (within the 10–13 constraint) |
| The four numbers named as "duplicates removed" (081125174670, 081125177001, 081125177002, 081125177362) | each present exactly once |

Those four appearing once is not contamination — it is what deduplication means. 100 raw entries containing 4 duplicate pairs collapse to 96 distinct values, and one surviving copy of each formerly-duplicated number is expected.

**Resolution:** the reconciliation phase stays in the plan (B006, B053) because a deterministic, re-runnable, self-reporting importer is worth having regardless. It is framed as *verification of a clean dataset*, not repair of a broken one. If the importer reports anything other than `source=96, accepted=96, rejected=0, duplicates=0`, the seed input has drifted from the specification and the run must fail loudly.

**C2 — Package prices: spec says TBD, the design ships numbers**

| Package | Price shown in design | Internet | Roaming | Voice | SMS |
|---|---|---|---|---|---|
| pkg_70gb | Rp 100 ribu | 70 GB | 1 GB | 200 min | 200 |
| pkg_120gb | Rp 120 ribu | 120 GB | 2 GB | 300 min | 300 |
| pkg_160gb | Rp 150 ribu | 160 GB | 2 GB | 400 min | 400 |
| pkg_220gb | Rp 200 ribu | 220 GB | 3 GB | 500 min | 500 |
| pkg_300gb | Rp 300 ribu | 300 GB | 5 GB | 1000 min | 1000 |

**Resolution:** treat as design placeholders. Seed with `price_status: 'draft'`, visible "harga sementara" affordance in non-production only. B091 requires an admin to flip `price_status` to `confirmed` before production readiness passes.

**C3 — Package schema too small for the design.** Extend schema (quota, roaming, voice, SMS, `recommended` flag, display order); document in DATA_MODEL.md (B013 equiv. → B022).

**C4 — "Pilih 1 Extra Benefit" undefined.** No catalogue, no selection rule. Out of scope v1 — render as non-interactive informational chip. OQ-3.

**C5 — Phone number format.** Accept `08…`, `+628…`, `628…`, spaces/hyphens; normalise to E.164 for storage; display as `08…`. One `normalizePhone()` utility, unit-tested.

**C6 — No countdown timer anywhere in the design.** Only "menit" occurrences are voice-minute figures; number screen subtitle makes an unbounded promise. Design gap. Add `ReservationTimer` bar (dark-red base, orange indicator per DESIGN.md), pinned below sticky header, rewrite subtitle to state the real guarantee, `aria-live="polite"` under 2 minutes with error colour shift.

**C7 — Order reference appears before the order exists.** Handled in A.4 — reference and tracking secret minted at reservation.

**C8 — Confirmation screen omits tracking credentials.** Add reference + token block with copy-to-clipboard and an explicit "shown only once" warning.

**C9 — Confirmation copy promises email/WhatsApp notification the project doesn't build.** Spec §4 puts this out of scope. Rewrite copy to describe self-service tracking; manual admin follow-up documented in RUNBOOK.md. OQ-5.

**C10 — Number status model.** Spec §7 lists four states, §6.5 references `SOLD_OFFLINE`. Adopt the five-state model from master prompt §8 verbatim. ADR-003.

**C11 — Internal contradiction in the spec's own lifecycle.** §6.2 says number "stays RESERVED" on submission; §7 says RESERVED→PENDING on submission. **§7 wins** — a reservation outliving its TTL while under review would be released by the janitor and double-sold; this is the more dangerous reading, resolved explicitly.

**C12 — Design tokens disagree between screens.**

| Token | pilih_nomor / DESIGN.md | pilihan_paket |
|---|---|---|
| background / surface | `#200e0d` | `#000000` |
| primary | `#ffb3ad` | `#ed0226` |
| on-primary | `#68000a` | `#ffffff` |
| outline-variant | `#5e3f3c` | `#2a2a2a` |
| surface-variant | `#462f2d` | `#4a0000` |

Two theming intentions collided: a Material-generated tonal palette and a hand-tuned "atmospheric black" pass. **Resolution:** `premium_crimson_pulse/DESIGN.md` frontmatter is canonical. The package screen's divergent values are re-expressed as purpose-named tokens: `--card-gradient-start: #4a0000`, `--divider: #2a2a2a`, `--brand-red: #ed0226`, `--highlight-orange: #fe6b00`. Recorded in DESIGN.md §Assumptions.

**C13 — Radius language inconsistent.** DESIGN.md frontmatter `lg: 1rem`; HTML config `lg: 0.5rem, xl: 0.75rem, 2xl: 1rem`; prose says 12px. In practice: number cards `rounded-xl` (12px), package cards `rounded-2xl` (16px), number-screen CTA `rounded-full`, package-screen CTA `rounded-xl`. **Resolution:** publish one explicit scale in DESIGN.md, pin per-component radii by name. CTAs standardise on `rounded-full`; package screen's `rounded-xl` CTA is the documented outlier.

**C14 — Number grid shows 10 of 96, with "Refresh," no search.** Implies a rotating subset. **Resolution:** serve a randomised page of 12 available numbers; "Refresh" re-rolls; add a digit-suffix search input as a design-consistent addition. Documented as an implementation decision.

**C15 — Every card in the reference is "Terkunci".** Reference shows a demo state only; no rendered available/selected example. **Resolution:** derive available state from base card class, selected state from `.active` variant + orange glow rule in DESIGN.md §Elevation.

**C16 — Mobile-only reference.** Every screen `max-w-[480px]`; no admin screen designed. **Resolution:** mobile-first stays canonical; ≥768px behaviour specified in DESIGN.md as an explicit implementation decision (centred 480px column with ambient gradient field, grid to 2–3 columns, scroller to grid). Admin reuses tokens at higher density.

**C17 — Student tracking mechanism.** Spec §6.3 tracks by email/WhatsApp alone; master prompt §7 forbids it. **Master prompt wins** (source priority rule 1) — knowing a classmate's phone number must never be enough to read their order.

**C18 — Admin access model.** Spec open item #2 floats "access-by-URL only"; master prompt §6 forbids it. **Master prompt wins.**

**C19 — Proof retention.** Spec §10 says "keep indefinitely"; master prompt §24 requires PII minimisation. **Resolution:** ADR-006 — proofs deleted 90 days after an order reaches a terminal state, order record retained. Non-blocking default.

**C20 — `config` needs a fourth document.** Timer TTL, max concurrent reservations per session, proof size cap have nowhere to live. Add `config/system`. Documented addition.

### B.3 Assumptions

| ID | Assumption | Needed because | Mechanism | Blast radius if wrong |
|---|---|---|---|---|
| A1 | Reservation TTL is 15 minutes | Spec says "10–15, TBD" | `config/system.reservation_ttl_minutes` | Config edit only, no code impact |
| A2 | Firebase App Hosting | Deployment target must be picked | No host-specific API used anywhere | Affects DEPLOYMENT.md, CI, secrets only |
| A3 | Design prices are placeholders | Prices marked TBD in spec, present in design | `price_status` field | Flip to `confirmed`, no structural change |
| A4 | "Extra Benefit" out of scope v1 | No domain defined | Informational chip | ~4 additional blocks if reversed: `config/benefits`, selection field, new UI state |
| A5 | Students on mobile, one order at a time | Drives per-session cap | `config/system` cap | Relax cap in config |
| A6 | Volume is campus-scale (hundreds, not tens of thousands) | Justifies manual verification, Firestore-based rate limiting | — | Manual verification queue breaks first, not the reservation engine |
| A7 | One static QRIS for all amounts | Follows spec | Admin matches amount by hand | Order detail shows expected amount prominently |

### B.4 Open questions

| # | Question | Why it matters | Recommended default | Blocking? |
|---|---|---|---|---|
| OQ-1 | Are the design prices commercially approved? | Students may see wrong prices | Ship as draft, gate production on confirmation | Blocking for production launch only |
| OQ-2 | Which universities belong in the dropdown? | Field validated against allowlist | Seed small Surabaya-area list, admin-editable | No |
| OQ-3 | What is "Extra Benefit"? | Whole feature undefined | Informational chip only | No |
| OQ-4 | Who bootstraps the first admin account, and for which email domain? | Cannot deploy without it | Documented one-off script run by project owner | Blocking for staging |
| OQ-5 | Does anyone actually send email/WhatsApp confirmations manually? | Confirmation copy currently promises it | Rewrite copy; document manual process | No |
| OQ-6 | Where is the real QRIS image, and who may replace it? | Payment screen non-functional without it | Placeholder in dev; admin-uploadable | Blocking for staging |
| OQ-7 | Is the offline-sales recap a file, or manual entry? | Determines whether bulk import is needed | Manual marking + bulk paste | No |
| OQ-8 | Retention period for payment proofs? | Legal/PII exposure | 90 days post-terminal | No |
| OQ-9 | Should rejected orders' numbers return to the pool automatically? | Spec says yes; may not match business reality | Follow spec | No |

---

## PART C — PROJECT DOCUMENTATION PLAN

### C.1 Files to be created (in the target repository, by the blocks in this playbook)

```
README.md                     Orientation, quickstart, script index
PRD.md                        Product requirements, journeys, acceptance criteria
DESIGN.md                     Implementation-oriented design specification
AGENTS.md                     Operating instructions for coding agents in this repo
ARCHITECTURE.md               System structure, flows, sequence diagrams
DATA_MODEL.md                 Collections, fields, indexes, invariants
API_SPEC.md                   Every trusted operation: contract, errors, authz
SECURITY.md                   Threat model, controls, rules rationale
TEST_PLAN.md                  Pyramid, scenarios, coverage expectations
DEPLOYMENT.md                 Environments, secrets, release, rollback
OPERATIONS.md                 Monitoring, routine tasks, SLOs
RUNBOOK.md                    Incident procedures, manual interventions
PROJECT_DECISIONS.md          Running decision register (lighter than an ADR)
docs/adr/001-architecture-stack.md
docs/adr/002-admin-authentication.md
docs/adr/003-number-status-lifecycle.md
docs/adr/004-reservation-concurrency.md
docs/adr/005-student-order-tracking.md
docs/adr/006-payment-proof-storage.md
docs/adr/007-offline-sales-status.md
docs/adr/008-seed-data-reconciliation.md
docs/adr/009-environment-strategy.md
docs/adr/010-observability-and-audit.md
docs/reports/seed-reconciliation.md   Generated, committed, regenerated on reseed
docs/reports/contradiction-audit.md   Output of B004
```

No ADR is proposed beyond these ten. Each corresponds to a decision that is expensive to reverse; a decision that is cheap to reverse goes in PROJECT_DECISIONS.md instead.

### C.2 Documentation sequencing rule

Phase 1 (documentation) completes before Phase 2 (bootstrap). This is deliberate: the reservation lifecycle, the status model, and the tracking scheme are all decisions where a wrong implementation is discovered weeks later inside a concurrency bug. Writing them down first makes them reviewable while they are still cheap.

### C.3 A deliberate deviation from the master prompt, stated plainly

Master prompt §35 requires every block to carry a repository-inspection preamble and §55 requires Git-safety instructions in every block. Reproducing both verbatim 140 times would add roughly 15,000 words of identical text and make the blocks harder to read.

**Resolution:** the preamble is defined once, verbatim, at the top of each blocks file as **SP-1**, with the instruction that it is prepended to every block when pasted into Claude Code. Each block additionally carries a `STOP IF` field with its own block-specific abort conditions. If strict literal compliance is preferred, a trivial script can splat SP-1 into each block — the operational behaviour is identical, and this way the blocks stay legible.
