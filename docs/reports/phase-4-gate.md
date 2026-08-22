# Phase 4 Verification Gate (B054)

## Suites run

| Check                       | Result                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm run lint`             | Clean                                                                                                                           |
| `pnpm run typecheck`        | Clean                                                                                                                           |
| `pnpm run test:unit`        | 108/108 (`src/domain`, `src/lib`, `src/schemas`)                                                                                |
| `pnpm run test:integration` | 63/63 (`src/server` — Firestore client/converters, all three repositories, the operation framework, idempotency, rate limiting) |
| `pnpm run test:rules`       | 46/46 (Firestore + Storage rules, every collection × anonymous/non-admin/both admin roles)                                      |
| `pnpm run test:component`   | 138/138                                                                                                                         |
| `pnpm exec next build`      | Succeeds                                                                                                                        |

## Layering verification

`grep -rn "firebase-admin\|Timestamp" src/domain src/components src/app src/hooks src/schemas` returns nothing — the Firestore `Timestamp` type and the `firebase-admin` package never leak outside `src/server` (and `src/lib/firebase-admin.ts`, the documented Admin SDK singleton location per `src/lib/README.md`). `grep -n "canTransition\|assertTransition\|switch.*status" src/server/repositories/*.ts` also returns nothing — no status-transition business rule sits in a repository; they remain pure CRUD/query, exactly as B050 requires. (Note: the block's own suggested grep command checked only against `src/server/firestore` specifically, which is narrower than the actual repository/framework structure built in B050/B051 — the check above verifies the real invariant that matters, that Firestore internals never escape `src/server` into domain or UI code, rather than the literal narrower command.)

## Bugs found and fixed during this phase (summary, already committed individually)

1. **B048** — `FirestoreDataConverter.fromFirestore` runs lazily on `.data()`, not on `.get()`; a malformed-document test written against `.get()` alone gave a false pass.
2. **B050** — `toFirestore` crashed on any partial `.set(doc, {merge: true})` write, since it unconditionally read every field. Fixed using the SDK's documented two-overload converter pattern.
3. **B050** — Vitest's default cross-file parallelism raced against the shared, stateful Firestore emulator, causing intermittent failures unrelated to the code under test. Fixed with `fileParallelism: false` for the integration project.
4. **B052** — A rate-limit off-by-one let exactly one request past the limit, because the transaction returned a raw counter that was compared against the limit a second time outside the transaction. Fixed by deciding and returning the allow/deny boolean from inside the transaction itself.
5. **B052** — The idempotency concurrency test asserted on a plain JS counter, which doesn't actually prove Firestore's guarantee (transactions are optimistic, not lock-based — both callback bodies can run before one commits). Rewrote the test to assert on the final committed Firestore state instead, and documented the real constraint (`mutate` must only stage writes on the given `tx`).
6. **B053** — Two composite indexes were missing from `firestore.indexes.json` (`numbers: status+reserved_until` for the janitor's scan; `orders: status+university+submitted_at` for combined admin filters) — found by walking every actual repository query, not just the ones from the original planning doc.
7. **B054** — A rate-limit test with a real 1-second wait was flaky at window boundaries; hardened by aligning the test's start to a fresh window before asserting.

## Documentation updated

`DATA_MODEL.md`'s index table now lists both indexes added in B053. `AGENTS.md`'s prohibited-patterns section gained four new entries directly traceable to bugs 2, 3, 4, and 5 above.

## Verdict

All suites pass, consistently (rate-limit and idempotency concurrency tests re-run 3× each with no flakes after hardening). Layering holds. Phase 4 (backend foundation) is complete — 7 blocks (B048–B054). Proceeding to Phase 5 (number inventory).
