# Phase 2 Verification Gate (B031)

## Checks run

| Check                                                                         | Result                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm run lint`                                                               | Clean                                                                                                                                                                                                                                                                  |
| `pnpm run typecheck`                                                          | Clean                                                                                                                                                                                                                                                                  |
| `pnpm run test:unit`                                                          | 3 files, 30 tests passed (`src/lib`: env, errors-backed format validation, id generation)                                                                                                                                                                              |
| `pnpm run test:component`                                                     | 1 file, 1 test passed (wiring smoke test — no real components yet)                                                                                                                                                                                                     |
| `pnpm exec next build`                                                        | Succeeds, static output for `/` and `/_not-found`                                                                                                                                                                                                                      |
| `pnpm run test:e2e`                                                           | 4 tests passed (mobile + desktop × load + a11y) against the bootstrap placeholder page                                                                                                                                                                                 |
| Firebase emulators (`firestore`, `storage`, `auth`)                           | Start cleanly, Emulator UI reachable at `:4000`, an unauthenticated client read against Firestore returns `403 PERMISSION_DENIED` (deny-all rules confirmed live), the Admin SDK connects and read/writes successfully (confirms Admin SDK bypasses rules as designed) |
| Secret/key scan (`git ls-files \| grep -iE 'serviceaccount\|\.env$\|\.pem$'`) | No matches                                                                                                                                                                                                                                                             |

## Environment note (not a repository finding, recorded for reproducibility)

The Firestore/Storage emulators require a JDK, which was not present in this environment. Installed `openjdk@21` via Homebrew (formula, not cask — no `sudo` required) and added it to `PATH` via `~/.zshrc`, matching Homebrew's own suggested step. This is a one-time local environment setup, not a repository or CI concern — CI runners typically ship a JDK already, and `DEPLOYMENT.md`'s environments (staging/prod) never run the emulators at all.

## Diff review

No stray boilerplate remains: `create-next-app`'s default demo page/styles/SVGs were removed in B026; the `commitlint.config.js`→`.mjs` rename and the `vite-tsconfig-paths` plugin removal (superseded by Vite's native `resolve.tsconfigPaths`) in this phase were both verified-clean follow-ups, not leftover cruft.

## `.gitignore` coverage confirmed

`.env*` (with `!.env.example` carved out), `node_modules`, `.next`/`out`/`build`, `coverage`/`playwright-report`/`test-results`, `.emulator-data`, `*-debug.log`, and `functions/lib`/`functions/node_modules` (the Functions codebase's independent dependency tree) are all present.

## README accuracy

Script table and "current status" section updated to reflect every script that exists as of this commit and the true current state (placeholder root page only, no student/admin functionality yet).

## Verdict

All checks pass. Proceeding to Phase 3 (design system).
