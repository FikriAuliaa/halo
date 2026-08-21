# Architecture Recommendation Memo (B007)

This memo commits to the architecture used for the rest of the build, with the rejected alternative recorded for each major decision. It supersedes nothing in `planning/00_EXECUTION_PLAN.md` Part A — it is that memo re-argued against the Phase 0 findings (repo audit, design audit, contradiction audit, open questions) rather than taken on trust.

## 1. Frontend: Next.js 15, App Router, TypeScript strict

**Decision.** Confirmed. The repo audit found no pre-existing frontend to reconcile against, so nothing here is constrained by legacy code.
**Rejected alternative:** a plain Vite SPA. Rejected because the trusted-tier placement (§2 below) needs a server runtime co-located with the client build; a separate SPA would need its own backend project just to host the Route Handlers, doubling deployment surface for no benefit.

## 2. Trusted tier: Next.js Route Handlers, not callable Cloud Functions

**Decision.** Confirmed. All mutating and privileged-read operations (`API_SPEC.md`'s twenty operations) execute as Route Handlers using `firebase-admin` with a service account / Application Default Credentials — never the client SDK.
**Rejected alternative:** Firebase Callable Functions as the trusted tier, with Next.js as a pure static/client shell. Rejected because it creates two deployable artefacts with two release cadences and two places business rules could live, and because App Hosting already runs Next.js on a Node server — there is no cold-start or scaling argument in Functions' favour that App Hosting doesn't already have. The one exception is the scheduled janitor (§4), which has no natural home inside a request/response Route Handler and is kept on Cloud Functions + Cloud Scheduler for that reason alone.
**Consequence, stated explicitly per the contradiction audit's C6/C15/C21 findings:** because the client never talks to Firestore directly, every UI state the design reference is missing (available/selected/locked-by-someone-else number cards, the countdown timer, loading/empty/error states) is driven entirely by the shape of what the Route Handler returns — there is no separate "client listens to Firestore" code path to keep in sync with it.

## 3. Database: Cloud Firestore, Native mode

**Decision.** Confirmed — matches REQ-045 (three collections) directly, and single-document transactions are exactly the primitive C11's resolved lifecycle (RESERVED → PENDING on submission, not "stays RESERVED") needs: one transaction on `numbers/{numberId}` can atomically check status, write the new status, and stamp `reserved_until`/`sold_at` with no distributed-transaction complexity.
**Rejected alternative:** a relational database (Postgres via Cloud SQL) with row-level locking. Rejected — REQ-045 specifies NoSQL/document structure explicitly, the query patterns here (single-document reads and transactional single-document writes) don't need relational joins, and Cloud SQL would add a VPC connector and a second service to operate for no correctness gain over a Firestore transaction.

## 4. Reservation authority: lazy expiry authoritative, scheduled cleanup is hygiene only

**Decision.** Confirmed, and this is the answer to REQ-075 and the resolution to C11. Any code path that reads a `numbers` document treats `status === 'reserved' && reserved_until <= serverTime` as logically available, before the janitor ever runs. The Cloud Scheduler-triggered function (every 2 minutes) exists only to rewrite stale documents so admin counts and indexes stay honest — its own uptime is never part of the correctness argument.
**Why this matters enough to argue, not assert:** the spec's REQ-075 answer ("scheduled cleanup job resets expired reservations") reads as if the cleanup job _is_ the mechanism. If it were, a missed run (deploy hiccup, quota, cold start) would leave a genuinely-expired reservation looking RESERVED to every reader, silently blocking a number no one actually holds — the opposite failure mode from double-booking, but still a real bug. Making expiry a predicate evaluated at read/transaction time, rather than a side effect of a job having run, removes the janitor from the trust boundary entirely.
**Rejected alternative:** Firestore TTL policies to auto-delete/reset expired reservation fields. Rejected because Firestore TTL deletes documents (or is only usable for whole-document expiry), not selectively-reset fields, and its deletion latency is "usually within 24 hours" — far too loose for a 15-minute reservation window.

## 5. Auth & RBAC: Firebase Authentication, custom claims, no obscure-URL admin

**Decision.** Confirmed, resolves C18/REQ-072. Two roles, `ADMIN_KAMPUS` and `ADMIN_TELKOMSEL`, as custom claims on the Firebase Auth user, checked server-side on every admin Route Handler — never inferred from a route path or client state.
**Rejected alternative:** a single shared admin password gating a client-side route guard. Rejected outright — spec §12 leaves this "TBD," not decided, so there is no existing decision to weigh against; the master prompt's explicit prohibition on obscure-URL admin models is dispositive.

## 6. Storage: private Cloud Storage bucket, server-mediated upload

**Decision.** Confirmed. Students have no Storage credentials (they're unauthenticated by design — REQ-NG-001), so proof upload is `multipart/form-data` to a Route Handler, which validates, re-encodes via `sharp` (strips EXIF, defeats polyglot files — addresses C22's finding that the reference ships no upload wiring at all, so this is greenfield), and writes via the Admin SDK. Admin viewing uses a 5-minute signed URL minted per request after the role check.
**Rejected alternative:** client-side upload directly to Storage using a Firebase Storage security-rule-scoped anonymous session. Rejected because it would require either public unauthenticated write rules (unacceptable for a bucket holding financial-proof images) or a per-student Firebase Auth session, which reintroduces the login requirement REQ-NG-001 explicitly excludes.

## 7. Scheduled work: Cloud Functions (2nd gen) + Cloud Scheduler, hygiene only

**Decision.** Confirmed, see §4. This is the one place Cloud Functions earns its keep: nothing in Next.js's request/response model has a "run every 2 minutes with no incoming request" primitive.
**Rejected alternative:** a `setInterval` inside a long-running Node process. Rejected — App Hosting instances scale to zero and aren't guaranteed to stay warm, so an in-process interval isn't reliable, and it would tie janitor uptime to app uptime in exactly the way §4 argues against.

## 8. Hosting: Firebase App Hosting

**Decision.** Confirmed (Assumption A2). One project, one IAM boundary, App Hosting's Node runtime supports the Route Handler tier natively, Secret Manager integration is built in.
**Rejected alternative:** Vercel for the frontend + a separate Firebase project for data/auth/storage. Rejected as the default because it's two platforms with two sets of credentials and two deploy pipelines for a project whose entire premise (§4 of the spec) is "lightweight, without over-engineering." Recorded as the standing alternative in ADR-001 in case an operational reason (team's existing Vercel usage, etc.) surfaces later — nothing in the codebase may depend on a host-specific API, so switching remains cheap if that happens.

## 9. Environments: three Firebase projects, not three sets of collections in one project

**Decision.** Confirmed. `dev` (emulators), `staging`, `prod` are separate Firebase projects. Rejected alternative: a single project with `dev_`/`staging_` collection prefixes — rejected because it makes an IAM or security-rules mistake in one environment capable of touching another environment's real student PII, which is precisely the kind of blast radius the master prompt's security section (§24) asks to be minimised.

## 10. Testing strategy: concurrency suite is the load-bearing test tier

**Decision.** Confirmed. Standard unit/integration/E2E/a11y/visual layers, plus a dedicated emulator-backed suite that fires genuinely parallel `reserveNumber` calls at the same document and asserts exactly one succeeds. This suite — not code review — is what justifies claiming the double-booking invariant holds (REQ-001, REQ-003).
**Rejected alternative:** relying on manual QA ("have two people click reserve on their phones at the same time") to validate concurrency. Rejected — not reproducible, not regression-safe, and exactly the kind of thing that passes in a demo and fails under real simultaneous campus-wide traffic at the start of a semester.

## Host-portability constraint, stated for `AGENTS.md`

Because App Hosting is Assumption A2 and not a firm requirement, no application code may call a Firebase-App-Hosting-specific API (e.g. its request-context helpers) or any other host-specific primitive. All Firebase interaction goes through the Admin/Client SDKs, which are portable to any Node host. This is what keeps a reversal of A2 a deployment-config change rather than a rewrite.

## Findings addressed or deferred

Every Phase 0 finding is either addressed above (C1–C23, all REQ-X markers) or explicitly deferred to its owning ADR (Phase 1). None makes the recommended stack unworkable — confirmed by the absence of any STOP-triggering finding in `contradiction-audit.md` or `open-questions.md`.
