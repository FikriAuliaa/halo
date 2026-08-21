# AGENTS.md — Rules for Coding Agents in This Repository

## Repository purpose

This is the Telkomsel Halo Number Ordering System: a serverless, no-student-login web app that lets university students reserve a phone number, choose a package, submit basic info, pay via a single static QRIS, and upload proof — with an admin panel to verify payments and manage inventory. The entire reason this system exists is to stop the same number being sold twice (once online, once through offline campus sales). Every architectural rule below exists to protect that one invariant.

## Architecture in ten lines

Next.js 15 (App Router, TypeScript strict) is both the UI and the trusted server tier — Route Handlers running on Node, using a direct Postgres connection (`postgres.js`, via Supabase) and the Supabase Auth admin client, are the only code allowed to mutate the database or Storage. No Supabase client SDK call is ever made from the browser; it only ever talks to our own Route Handlers, which return projections, and every table has Row Level Security enabled with no policies — the service-role connection is the only access path, by construction. Postgres holds `numbers`, `orders`, `config`, `sessions`, `audit_log`, `idempotency_keys`, `rate_limits`, and `admin_users`. Reservation correctness is **lazy-expiry-authoritative**: any transaction that touches a number treats an expired `reserved_until` as available _before_ checking anything else — a scheduled `pg_cron` job cleans up stale rows for tidiness, but nothing about correctness depends on it running, and the reservation transaction itself takes a real row lock (`SELECT ... FOR UPDATE`) rather than relying on an optimistic retry. Students never authenticate; admins do, via Supabase Auth, with their role looked up from the `admin_users` table (`ADMIN_KAMPUS` / `ADMIN_TELKOMSEL`), checked server-side on every admin request. Payment proofs are uploaded through a Route Handler (never client-direct), re-encoded server-side, and stored in a private Supabase Storage bucket with no public read policy. Full detail: `ARCHITECTURE.md`, `DATA_MODEL.md`, `API_SPEC.md`.

**Migration note:** this system was originally planned and partially built on Firebase (Firestore/Firebase Auth/Cloud Functions); it moved to Supabase/Postgres mid-build. Any surviving doc passage describing Firestore documents, Firebase Auth custom claims, or Cloud Functions is stale — Postgres tables, Supabase Auth + `admin_users`, and `pg_cron`/Edge Functions are the current architecture.

## Directory map

```
src/app/(student)/    Student-facing routes — number, package, form, payment, confirmation, tracking
src/app/(admin)/      Admin routes — dashboard, orders, numbers, packages, universities, payment config
src/app/api/          Route Handlers — the trusted tier. Every mutation and every privileged read lives here.
src/components/ui/    Design-system primitives (button, input, card, chip, badge, progress, modal, toast) per DESIGN.md
src/components/student/  Screen-specific composed components for the student flow
src/components/admin/    Screen-specific composed components for the admin flow
src/domain/            Pure business logic: status transitions, reservation rules, price/expiry calculations. No I/O.
src/server/             Trusted-tier implementation: repositories, the twenty operations from API_SPEC.md, auth checks.
src/lib/                Cross-cutting utilities: env validation, error types, id/token generation, formatting, time.
src/schemas/            Zod schemas, shared between client-side form validation and server-side enforcement.
```

Each directory has its own `README.md` stating its purpose and what must not go in it (added in B026).

## Naming conventions

Firestore field names: `snake_case`, matching `DATA_MODEL.md` exactly — do not translate to `camelCase` at the persistence layer; convert at the repository boundary if a camelCase shape is needed in TypeScript. Route Handler paths and operation names: match `API_SPEC.md` exactly (`reserveNumber`, `submitOrder`, etc.) — if you need an operation that isn't in `API_SPEC.md`, add it there first, in the same PR, before implementing it. Status enum values: `available | reserved | pending | sold | sold_offline`, lowercase, exactly as in ADR-003 — never introduce a synonym.

## State management conventions

Server state (number availability, reservation status, order status) is never cached client-side as a source of truth. `localStorage`/`sessionStorage` may hold _display hints_ (e.g. "last known seconds remaining" for optimistic UI) but every page load and every mutation re-validates against the server. The reservation `sessionId` lives only in an `httpOnly` cookie the client never reads or constructs.

## The one rule that matters most

**All mutations go through trusted server operations.** No component, hook, or client utility may write to Firestore or Storage directly, under any circumstance, including "just for the admin panel" or "just for a quick fix." If a mutation doesn't exist yet, add it to `API_SPEC.md` and implement it under `src/server/`, then call it from the client via `fetch`.

## Firestore & Storage rules conventions

Rules are deny-by-default and stay that way — they are a defence-in-depth backstop, not the primary access control, because the client never talks to Firestore/Storage directly. When you add a new collection or field, update `firestore.rules`/`storage.rules` to still deny it by default; do not add a permissive rule "to unblock testing." Use the emulator for that instead.

## Testing expectations by change type

| Change                                      | Required tests                                                                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Pure function in `src/domain` or `src/lib`  | Unit test, including edge cases (boundary timestamps, empty input, max-length input)                                   |
| New Route Handler / server operation        | Integration test against the emulator, covering success + every documented error code                                  |
| Anything touching `numbers` document writes | A concurrency test proving the one-owner invariant, even if the change looks unrelated to reservations at first glance |
| New UI component                            | Component test for each state in `DESIGN.md` §7's state matrix that applies to it                                      |
| New student-facing page                     | At least one Playwright E2E scenario, plus an `@axe-core/playwright` pass                                              |
| Any visible layout change                   | Visual snapshot updated intentionally, never regenerated blindly to make a diff pass                                   |

Run tests before committing; do not commit with a known-failing suite and a TODO.

## Accessibility expectations

Every interactive element ships a visible keyboard focus state, a real `<label>`/`aria-label`, and a minimum 44×44px hit target. Color is never the only signal. See `DESIGN.md` §12 for the full baseline — it is not optional polish, it is part of the definition of done for any UI block.

## Visual fidelity expectations

`DESIGN.md` is the single source of truth for tokens, spacing, radius, and states — not the raw HTML in the design ZIP, which is reference material with documented inconsistencies (`docs/reports/design-audit.md`). When a screen's reference markup conflicts with `DESIGN.md`, `DESIGN.md` wins; if you find a new conflict `DESIGN.md` doesn't cover, resolve it there first, then build.

## Security constraints

See `SECURITY.md` for the full model. The non-negotiables: no admin route without a server-side role check on every request (never trust a client-side guard alone); no payment proof ever gets a public URL; every file upload is re-encoded server-side before storage, never trusted as-uploaded; every generated `order_ref`/tracking token uses a CSPRNG, never `Math.random()`; error responses to students never leak internal state (Firestore error text, stack traces, document IDs beyond what the student already knows).

## Prohibited patterns

- No Firebase client SDK writes, anywhere, for any reason.
- No client-side-only enforcement of a server rule (a disabled button is UX, not security — the server must reject it too).
- No business logic inside a React component — if it's a rule (a price calculation, a status transition, an expiry check), it belongs in `src/domain` and is called from both the component and the server.
- No `any` without an inline comment justifying it.
- No `localStorage`/`sessionStorage` as the source of truth for reservation or order state.
- No secrets in source, and no secret value in a `NEXT_PUBLIC_*` variable — see `.env.example` for what's safe to expose.
- No host-specific API calls (nothing that only works on Firebase App Hosting specifically) — see `docs/reports/architecture-recommendation.md` §8 for why.
- No hardcoded prices, reservation TTLs, or university names in component code — these are config-driven (`config/packages`, `config/system`, `config/universities`).
- No public Storage read rule for the proofs path, ever, including "just for debugging."
- No admin route rendered or reachable without a server-side role check.
- No component that uses a React hook (`useState`, `useEffect`, `useId`, etc.), attaches a native event handler (`onClick`, `onChange`, ...), or wraps a Radix primitive, without a `"use client"` directive at the top of the file — App Router treats every component as a Server Component by default, and this fails at build/runtime, not silently (B044 caught this across the entire initial UI library at once: every interactive primitive was missing it).
- No `aria-label` on a plain `<div>`/`<span>` with no ARIA role — axe flags this as invalid (only elements with a naming-capable role accept a label); add `role="status"` (or whatever role is actually appropriate) alongside it, not instead of fixing the real omission (B047).
- No loading/busy state that hides _all_ of an interactive element's accessible content (e.g. swapping the entire label for a spinner via `aria-hidden`/`visibility:hidden`) — the element must keep an accessible name while busy. `aria-busy="true"` announces state, it does not supply a name (B047 caught this in the loading `Button`).
- **(Historical, pre-migration — `src/server/firestore/` no longer exists.)** No `FirestoreDataConverter.toFirestore` written for only the full-document shape if that converter's collection is ever partially updated via `.set(doc, { merge: true })`. The Postgres equivalent this lesson generalizes to: every repository's `updateFields` takes a `Partial<Row>` and builds its `SET` clause only from the keys actually present (`sql(fields)`) — never assume every column is being written.
- No integration test suite that assumes Vitest's default cross-file parallelism is safe against a shared, stateful backend (the Firestore emulator) — set `fileParallelism: false` for any Vitest project whose tests mutate shared documents, or isolate every test's data completely. B050's repository tests intermittently failed under parallel file execution for reasons unrelated to the code being tested until this was set.
- No code inside a `withIdempotency`/`withTransaction` callback that has a side effect other than staging a write via the given `tx` handle. Postgres transactions here are lock-based (`SELECT ... FOR UPDATE`), not optimistic — a real row lock, not a retry, is what makes "exactly one wins" true — but the same discipline still matters: an external API call, or a mutation of shared in-process state, inside that callback runs even if the transaction later rolls back, so it's never covered by the transaction's own atomicity guarantee.
- No rate-limit/counter check that reads a value inside a transaction, returns that raw value, and compares it again _outside_ the transaction to decide the outcome — decide and return the boolean outcome (allowed/blocked) from inside the transaction itself. Comparing the pre-increment count against the limit a second time outside the transaction produces an off-by-one that lets exactly one too many requests through (B052).

## How to run the project

Once bootstrapped (Phase 2): `pnpm install`, `pnpm db:start` (local Supabase stack via Docker), `pnpm dev` (Next.js dev server against it), `pnpm seed` (imports `data/seed/numbers.source.txt` via the reconciled importer). See `README.md` for the full quickstart once it exists.

## How to run tests

`pnpm test:unit` · `pnpm test:integration` (requires emulators running) · `pnpm test:e2e` (Playwright) · `pnpm test:a11y` · `pnpm test:coverage`. See `TEST_PLAN.md` for what belongs in each tier.

## How to validate a change before committing

Run lint, typecheck, and the test tier(s) relevant to the change per the table above. For anything touching the reservation engine, run the concurrency suite specifically, not just the general integration suite. For anything touching a student-facing screen, do a manual pass against `DESIGN.md`'s state matrix for that component.

## Commit conventions

Conventional Commits (`feat`, `fix`, `docs`, `test`, `refactor`, `style`, `chore`, `security`), scoped to the area touched (`feat(reservations): ...`, `docs(admin): ...`). One logical change per commit. Never bundle a schema change with an unrelated UI tweak.

## When an ADR is required

When a change would be expensive to reverse: a change to the status lifecycle, the reservation concurrency mechanism, the tracking model, the auth/RBAC model, the proof-storage approach, or the environment/deployment topology. If you're not sure, check whether reversing your change later would require a data migration or a security-boundary rewrite — if yes, write the ADR first (`docs/adr/000-template.md`), then implement.

## When documentation must be updated in the same commit

Any change to: a Firestore field or collection (→ `DATA_MODEL.md`), a Route Handler's contract or error codes (→ `API_SPEC.md`), the status lifecycle (→ `PRD.md` + the owning ADR), a security control (→ `SECURITY.md`), an environment variable (→ `DEPLOYMENT.md` + `.env.example`), or a design token/component state (→ `DESIGN.md`). Documentation drift is a bug, not a follow-up task.
