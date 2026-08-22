# Phase 6 Verification Gate (B070)

## Context: mid-phase platform migration

Partway through Phase 6, the project moved off Firebase/Firestore onto Supabase/Postgres (see the `refactor: migrate backend from Firebase/Firestore to Supabase/Postgres` commit). Per explicit direction, the remainder of this phase — and all subsequent phases — proceeds **without** a full test/commit cycle after every block; verification below reflects that lighter cadence: typecheck/lint/build after each batch, plus targeted live smoke tests against a real (throwaway, Docker) Postgres instance for the highest-risk logic, rather than a full automated suite per block.

## What's built (B061–B069)

- **B061** — `sessions` table + `SessionRepository`/`session.ts`: server-controlled anonymous identity, `getOrCreateSession`/`requireSession`.
- **B062** — `src/domain/reservation.ts`: `Reservation` type, `mintOrderRef`/`mintReservationId`/`mintTrackingToken`/`computeReservedUntil`/`isExpired`.
- **B063** — `reserveNumber`: atomic via a Postgres transaction with `SELECT ... FOR UPDATE` row locking (replaces Firestore's optimistic-retry model). `POST /api/numbers/{id}/reserve`.
- **B064** — `validateReservation`: four-state read-only union (`valid`/`expired`/`not_found`/`taken_over`). `GET /api/reservations/current`.
- **B065** — `releaseReservation`: idempotent voluntary release, refuses `pending`, refuses a takeover with `SESSION_MISMATCH`. `POST /api/reservations/current/release`.
- **B066** — **not built as a standalone formal suite** (deferred — see below). Its core claim was instead verified live (see "Live verification").
- **B067** — `cleanup_expired_reservations()` Postgres function, `pg_cron` every 2 minutes (`supabase/migrations/20260101000100_reservation_cleanup.sql`). One atomic `SELECT ... FOR UPDATE SKIP LOCKED` + data-modifying CTE — simpler and more robust than the originally-planned per-row Cloud Function loop, since Postgres gives an atomic conditional bulk update natively.
- **B068** — `adminRunCleanup` (calls the identical SQL function on demand) and `adminForceReleaseReservation` (audited, mandatory reason, `ADMIN_TELKOMSEL` only).
- **B069** — `src/server/observability/events.ts`: `reservation_created`/`reservation_failed`/`reservation_expired`/`reservation_released`/`reservation_taken_over`/`cleanup_run`, wired into every relevant route; session IDs hashed, never logged verbatim.

## Live verification (real Postgres, not mocked)

A throwaway `postgres:16-alpine` Docker container was seeded with the actual migration and exercised directly through the real TypeScript operations (not test doubles):

1. **Basic reservation** — succeeds, returns absolute server time, a matching `order_ref`, and a tracking token whose hash matches what's stored.
2. **20-way genuine concurrency** (`Promise.all` against one contested number) — **exactly 1 succeeded, 19 received `NUMBER_UNAVAILABLE`**, every time. This is the single most important guarantee in the system, and it now rests on real Postgres row locking rather than Firestore's optimistic-transaction retries.
3. **A5** — a session already holding a live reservation is refused a second number; correctly _not_ refused once that first reservation has lazily expired (verified by pre-seeding an expired row and a stale session pointer).
4. **Expired-reservation overwrite** — a `reserved`-but-lapsed row is silently and correctly overwritten by a fresh reservation.
5. **`releaseReservation`** — normal release; idempotent double-release (`{released: false}`, no error); refuses a `pending` number with `CONFLICT`.
6. **`adminForceReleaseReservation`** — releases a live reservation, writes a matching `audit_log` row with the supplied reason.
7. **`adminRunCleanup`** / `cleanup_expired_reservations()` directly — released exactly the expired row, left a live one and an already-available one untouched.
8. **Admin number management** (B058, re-verified post-migration) — `adminAddNumbers` (created/invalid/duplicate outcomes), `adminListNumbers`, `adminMarkSoldOffline` (per-entry outcomes) all behave identically to their pre-migration Firestore versions.

Found and fixed during this verification: `NumberRepository.updateFields`/`OrderRepository.updateFields` generated invalid SQL (`SET` with nothing) if ever called with an empty fields object — no real caller does this today, but both now guard against it defensively.

## Deferred: B066's formal concurrency suite

The dedicated `tests/concurrency/reservation-concurrency.test.ts` (12 scenarios × 20+ repetitions, `tests/helpers/parallel.ts`/`invariants.ts`, the "deliberately break the guard and confirm the suite catches it" check) was **not** written as a standalone artifact in this pass — per the explicit direction to stop running a full test/commit cycle per block. Scenario 1 (simultaneous reservation) and scenario 3's spirit (expiry-boundary race, via the pre-seeded-expired-row case) were covered by the live verification above; scenarios 2, 4–12 (staggered jitter, admin-race conditions, idempotency-key replay under concurrency, tab duplication, janitor-racing-a-live-reservation) were not independently exercised. **This is a known gap**, explicitly carried forward to the dedicated Testing phase (Phase 16) rather than closed now, per the user's own prioritization.

## Layering check

`grep -rn "canTransition\|assertTransition" src/server/repositories` returns nothing — no status-transition rule lives in a repository. Reservation-specific decision logic (the A5 check, expiry interpretation, idempotent-reuse detection) lives in `src/server/operations/reserve-number.ts`/`validate-reservation.ts`/`release-reservation.ts`, and the lifecycle table itself in `src/domain/number-status.ts` — nothing reservation-specific leaked into `src/components` or `src/app`.

## Documentation

`ARCHITECTURE.md`/ADR-004 still describe the Firestore-era mechanism in detail; `AGENTS.md` now carries a blanket migration note plus an updated ten-line architecture summary, but the deeper architecture docs have not been fully rewritten for Postgres yet — another explicitly deferred item, prioritized behind finishing the feature set.

## Verdict

Core reservation correctness — the reason this system exists — is verified against real concurrent load on the actual production database engine, not a mock. The formal B066 suite and full doc rewrite are deliberately deferred, not silently skipped. Proceeding to Phase 7 (student ordering flow).
