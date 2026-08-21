# TEST_PLAN.md

## Pyramid

### Unit — `src/domain`, `src/lib`, Vitest + jsdom-free Node environment

What belongs here: pure functions with no I/O — status-transition validity checks, price/total calculation, expiry-predicate evaluation (`reserved_until <= now`), phone normalisation (`normalizePhone`), `order_ref`/token generation and their format/entropy, currency/date formatters. What must not: anything touching Firestore, Storage, or `fetch` — those are integration tests. Coverage target: high (90%+ line coverage) for `src/domain`, since this is where the one-owner invariant's logic actually lives even though its _enforcement_ is transactional (tested separately, below).

### Integration — emulator-backed, Vitest Node environment

What belongs here: every Route Handler under `src/app/api`, exercised against the Firebase Emulator Suite (Firestore + Storage + Auth emulators), asserting both the success path and every documented error code from `API_SPEC.md`. Also: Firestore/Storage security-rules tests using `@firebase/rules-unit-testing`, run against the same emulators. What must not: mocking Firestore — a mocked Firestore can't prove a transaction's guard predicate actually holds under contention, which is the entire point of this tier.

### Concurrency — emulator-backed, dedicated suite

The tier that justifies trusting the system (`ARCHITECTURE.md`). Named scenarios, each firing genuinely parallel requests (via `Promise.all` against real emulator transactions, not sequential awaits):

1. Two `reserveNumber` calls for the same number, same instant → exactly one 200, one `NUMBER_UNAVAILABLE`.
2. A `reserveNumber` call arriving in the same instant a reservation's `reserved_until` passes → resolves deterministically one way or the other, never both succeed.
3. `submitOrder` retried twice with the same `idempotency_key` after a simulated timeout → one order created, both responses identical.
4. Two admin sessions calling `adminVerifyPayment` on the same order simultaneously → exactly one 200, one `CONFLICT`.
5. `adminMarkSoldOffline` racing a student's `reserveNumber` on the same number → whichever transaction commits first wins; the loser gets a clean, documented error, never a corrupted intermediate state.
6. Reservation expires while the order form is open, then `submitOrder` is attempted → `RESERVATION_EXPIRED`, no number/order mutation occurs.

Every scenario asserts the one-owner invariant (`DATA_MODEL.md`) held throughout, not just that the two responses "look right."

### E2E — Playwright, mobile (390×844) + desktop (1440×900) projects

Scenarios A–L (master prompt §45), each with explicit preconditions and assertions:

| Scenario                                          | Precondition                             | Assertion                                                                              |
| ------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------- |
| A — happy path                                    | Available number exists                  | Order reaches PENDING; confirmation shows `order_ref` + token                          |
| B — competing reservations                        | Same number, two browser contexts        | Exactly one context proceeds past selection                                            |
| C — reservation expiry                            | TTL shortened via test config            | Number returns to the visible pool; UI shows the expired state                         |
| D — refresh mid-reservation                       | Active reservation, page reload          | Reservation persists (session cookie), countdown resumes at the correct remaining time |
| E — submit after expiry                           | Expired reservation, form still open     | Submission rejected with a clear message, no order created                             |
| F — invalid file upload                           | —                                        | Client-side rejection message; no request sent for a >5MB or wrong-type file           |
| G — valid proof upload                            | —                                        | Order reaches PENDING                                                                  |
| H — admin verifies                                | PENDING order                            | Order → VERIFIED, number → SOLD, tracking page reflects it                             |
| I — admin rejects                                 | PENDING order                            | Order → REJECTED, number → AVAILABLE again, reservable by a new session                |
| J — mark sold offline                             | AVAILABLE number                         | Number no longer appears in the student-facing list                                    |
| K — unauthorized admin access                     | No/invalid session                       | Redirected/denied, no protected data rendered                                          |
| L — Admin Kampus attempts a Telkomsel-only action | `adminMarkSoldOffline` as `ADMIN_KAMPUS` | `FORBIDDEN`, documented per RBAC                                                       |

### Accessibility — `@axe-core/playwright`, run against every student and admin page

Zero serious/critical violations permitted to merge. Manual checks supplement automated ones for: keyboard-only completion of the full student happy path, focus order, and modal focus-trapping.

### Visual regression — Playwright snapshot testing

Baseline snapshots for all five student screens (both palette variants) plus the admin dashboard and order-detail screens, at mobile and desktop breakpoints. A snapshot diff is never accepted "to make CI pass" without a human confirming the visual change was intentional.

## Coverage expectations by area

High (explicit line/branch targets, enforced in CI): `src/domain`, `src/server` (the trusted-tier operations), Firestore/Storage rules. Pragmatic (meaningful-scenario coverage, not a percentage target): UI components, since the state matrix in `DESIGN.md` §7 is the actual coverage contract there, not a coverage percentage.

## Flaky test handling

A flaky test is quarantined (moved to a `.quarantine` suite excluded from the required CI gate) with an owner and a deadline recorded in the test file itself as a comment, never silently skipped or deleted. A quarantined test past its deadline blocks the next release checklist item until resolved.

## Traceability

Every business rule in `PRD.md` has at least one named test above: the one-owner invariant → the concurrency suite; the status lifecycle → E2E scenarios H/I/J plus unit tests on `src/domain`'s transition validator; login-free tracking → the `getTrackingStatus` integration tests plus E2E scenario A's confirmation-screen assertion; manual verification → E2E H/I; RBAC → E2E K/L plus rules-emulator tests.
