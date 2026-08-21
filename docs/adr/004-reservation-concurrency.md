# ADR-004: Reservation Concurrency Model

**Status:** Accepted
**Date:** 2026-08-20
**Owning blocks:** B021, Phase 6 (B061–B072)

## Context

REQ-001/REQ-003 require that at most one student ever holds a given number at a time, under real concurrent load — this is the entire reason the system exists (spec §1). The mechanism must not depend on client state (clock, `localStorage`, session ID) or on a background job's uptime for correctness (master prompt §9/§22).

## Decision

**Single-document Firestore transactions** on `numbers/{numberId}` are the only write path for any status transition. Every transition-triggering operation (`reserveNumber`, `submitOrder`, `adminVerifyPayment`, `adminRejectPayment`, `adminMarkSoldOffline`) reads the current document inside the transaction, evaluates the guard predicate against a **server-authoritative timestamp** (`Timestamp.now()`, read at transaction execution time — never a client-supplied value), and only commits if the predicate holds. Firestore's transaction semantics (optimistic concurrency, automatic retry on contention, abort if the read set changed before commit) do the actual serialisation; no application-level lock is implemented or needed.

**The guard predicate for `reserveNumber` specifically:**

```
status === 'available' OR (status === 'reserved' AND reserved_until <= serverNow)
```

evaluated inside the transaction. Two concurrent `reserveNumber` calls against the same document: Firestore executes both transaction functions, but only one commit wins; the loser's transaction is retried against the now-updated document, re-evaluates the predicate, finds it false, and returns `NUMBER_UNAVAILABLE` — cleanly, not as a crash or an inconsistent partial write.

**Lazy expiry is authoritative; the scheduled janitor is hygiene, not correctness.** Every reader of a `numbers` document (not just the transactional writer) applies the same predicate before trusting the stored `status` field. This means the system's correctness never depends on `cleanupExpiredReservations` (Cloud Function, 2-minute schedule) having run recently — a missed run only delays when the _stored_ field catches up to reality; every live code path already computes reality correctly regardless. See `docs/reports/architecture-recommendation.md` §4 for the extended argument.

**Idempotency keys** (`DATA_MODEL.md`'s `idempotency_keys` collection) make `reserveNumber` and `submitOrder` safe against client retries (a timeout that causes the client to resend an identical request): the second request with the same key returns the first request's stored result rather than attempting the operation again.

**The formal invariant:** for any `numberId`, at most one of {a live reservation, a `pending` order, a `sold`/`sold_offline` state} holds at any instant. This is asserted by the concurrency test suite (`TEST_PLAN.md`), not merely claimed.

## Alternatives considered

- **A distributed lock (e.g. a separate "lock" document, acquired before touching `numbers`).** Rejected: adds a second document and a second failure mode (a lock that's acquired but never released on a crashed request) for no benefit over what a native Firestore transaction already provides on the single document that matters.
- **Optimistic UI with client-side "claim" state, reconciled asynchronously.** Rejected: this is exactly the "trust the client-side session ID / optimistic UI" pattern master prompt §9 forbids; a UI can _display_ optimistically, but the reservation's actual authority is never allowed to live client-side.
- **Making the scheduled cleanup job the authority (matching a literal reading of spec REQ-075).** Rejected — argued at length in §4 of the architecture-recommendation memo: a job-is-authority model fails in the direction of "silently blocks an available number" whenever the job is late, which is a real, not theoretical, failure mode (deploys, cold starts, quota).
- **Firestore TTL policies for automatic field expiry.** Rejected — TTL deletes whole documents (or requires restructuring reservations into their own short-lived documents) and has multi-hour latency, far looser than a 15-minute reservation window requires.

## Consequences

Every operation that touches `numbers.status` must be written as a transaction — a plain `update()` call is disallowed by convention (`AGENTS.md`) precisely because it would silently reintroduce the race this ADR closes. Retrying a transaction under contention has a latency cost (Firestore's automatic backoff-and-retry), accepted as the price of correctness at campus scale (Assumption A6).

## Verification

The concurrency test suite in `TEST_PLAN.md` (scenarios 1–6), run against the Firebase Emulator Suite with genuinely parallel requests via `Promise.all`, not sequential awaits — sequential-await "concurrency" tests would not actually exercise Firestore's contention-retry path and would give false confidence.
