# ADR-001: Architecture Stack

**Status:** Accepted
**Date:** 2026-08-20
**Owning blocks:** B007, B020, all of Phase 2–17

## Context

A greenfield system (repo audit, B001, confirmed no pre-existing code) needs a frontend, a trusted server tier, a database, storage, auth, and a hosting target, chosen to fit: no student login, serverless, NoSQL, low operational complexity for a small admin team (spec §3), and a hard correctness requirement around concurrent number reservation (REQ-001/003).

## Decision

Next.js 15 (App Router, TypeScript strict) serves both the UI and, via Route Handlers running on Node with `firebase-admin`, the entire trusted server tier — there is no separate backend service. Cloud Firestore (Native mode) is the database. Firebase Authentication with custom claims handles admin RBAC. Cloud Storage (private bucket) holds payment proofs. A single Cloud Function + Cloud Scheduler handles the one piece of work that doesn't fit a request/response model: scheduled reservation cleanup. Firebase App Hosting is the deployment target (Assumption A2). Three separate Firebase projects (dev-emulated, staging, prod) form the environment strategy (ADR-009).

## Alternatives considered

- **Callable Cloud Functions as the trusted tier, Next.js as a static/client-only shell.** Rejected: two deployable artefacts, two release cadences, two places business rules could live. A Route Handler with a service account is exactly as server-authoritative as a callable Function, so this split buys nothing.
- **Vercel (frontend) + Firebase (backend) as two platforms.** Rejected as the default: two credential sets, two deploy pipelines, for a project whose own brief (spec §3) explicitly asks for low operational complexity. Recorded here as the standing alternative if a concrete operational reason surfaces later — nothing in the codebase may depend on a host-specific API (`AGENTS.md`), so this remains cheap to revisit.
- **Cloud SQL (Postgres) instead of Firestore.** Rejected: spec §8 specifies NoSQL/document structure explicitly, and the actual query patterns (single-document transactional reservation) don't need relational joins.
- **A `setInterval` inside a long-running process instead of Cloud Scheduler + Functions.** Rejected: App Hosting instances scale to zero; an in-process interval isn't reliable and ties janitor uptime to app uptime, which ADR-004 specifically argues against needing.

## Consequences

The app cannot be statically exported (Route Handlers require a Node runtime). The client never imports the Firebase client SDK for Firestore/Storage — every read and write is mediated. Reversing A2 (hosting choice) later is a deployment-config change, not a rewrite, because of the host-portability constraint. Reversing the Firestore choice would be a full data-layer rewrite — this is the single most expensive-to-reverse decision in the stack, which is why it gets an ADR rather than a `PROJECT_DECISIONS.md` entry.

## Verification

`AGENTS.md`'s "prohibited patterns" section bans Firebase client SDK writes and host-specific APIs, enforced by a custom ESLint rule (B027). `docs/reports/architecture-recommendation.md` carries the full argument this ADR formalises.
