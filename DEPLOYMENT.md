# DEPLOYMENT.md

## Environments

| Environment | Firebase project                      | Data                                 | Purpose                           |
| ----------- | ------------------------------------- | ------------------------------------ | --------------------------------- |
| `dev`       | none (Firebase Emulator Suite, local) | Seeded fixtures, freely resettable   | Local development                 |
| `staging`   | `halo-staging` (separate project)     | Scrubbed/synthetic student data only | Pre-production verification, demo |
| `prod`      | `halo-prod` (separate project)        | Real student data                    | Live                              |

Three separate Firebase projects, never collection-prefix separation within one project — see ADR-009. Promotion is one-directional: `dev` → `staging` → `prod`, never skipped.

## Environment variables

See `.env.example` for the authoritative, always-in-sync list. Summary:

| Variable                           | Public? | Purpose                                                                                                                                                                  |
| ---------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_FIREBASE_API_KEY`     | Yes     | Firebase web SDK config — not a secret; Firebase's own docs confirm this is safe to expose, security comes from rules + our server-mediation, not from hiding this value |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`  | Yes     | Same                                                                                                                                                                     |
| `NEXT_PUBLIC_FIREBASE_APP_ID`      | Yes     | Same                                                                                                                                                                     |
| `FIREBASE_SERVICE_ACCOUNT_JSON`    | No      | Only set locally/CI where ADC isn't available; deployed environments use Application Default Credentials instead and this is unset                                       |
| `RESERVATION_TTL_MINUTES_OVERRIDE` | No      | Test-only override for E2E scenario C; never set in staging/prod                                                                                                         |
| `FIRESTORE_EMULATOR_HOST`          | No      | Local dev only                                                                                                                                                           |
| `FIREBASE_STORAGE_EMULATOR_HOST`   | No      | Local dev only                                                                                                                                                           |
| `FIREBASE_AUTH_EMULATOR_HOST`      | No      | Local dev only                                                                                                                                                           |
| `SESSION_COOKIE_SECRET`            | No      | Signs the reservation session cookie                                                                                                                                     |
| `APP_CHECK_SITE_KEY`               | Yes     | reCAPTCHA/App Check public key                                                                                                                                           |

Every `NEXT_PUBLIC_*` variable above is justified as safe per Firebase's own security model (rules + server-mediation are the actual boundary, not obscurity of the web config).

## Secret handling

Non-public values live in Secret Manager, surfaced to App Hosting via its environment configuration at deploy time. No secret value is ever written to a `.env` file that gets committed; `.env.local` is gitignored.

## Build and deploy sequence

1. `pnpm build` (Next.js production build, typecheck as part of the build).
2. `firebase deploy --only firestore:rules,firestore:indexes` — rules and indexes deploy independently of app code, and indexes should land _before_ the code that depends on them.
3. `firebase deploy --only storage` — Storage rules.
4. `firebase deploy --only functions` — the scheduled janitor.
5. App Hosting deploy (triggered by the platform's own build pipeline against the target branch/commit).

## Pre-deploy checklist

Lint clean · typecheck clean · full test suite green (including concurrency and rules-emulator suites) · `docs/reports/seed-reconciliation.md` re-run and still `96/96/0/0/96` if the seed source changed · `.env.example` matches every variable actually referenced in code · no `price_status: draft` package remaining if deploying to `prod` (OQ-1 gate) · a real QRIS asset configured if deploying to `prod` (OQ-6 gate).

## Smoke tests

Post-deploy, against the live environment: `getAvailableNumbers` returns a non-error response; a full reservation → release cycle succeeds; an admin can log in and reach the dashboard; the scheduled function's last-run timestamp is recent (Cloud Scheduler logs).

## Rollback

| Artefact                | Procedure                                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| App                     | App Hosting revision rollback — no data migration involved, safe to do at any time                                                                |
| Firestore/Storage rules | Redeploy the prior committed version from Git history via `firebase deploy --only firestore:rules` / `storage` — never hand-edited in the console |
| Indexes                 | Additive index changes roll forward safely; removing an index is only safe once confirmed no deployed code path still depends on it               |
| Functions               | Redeploy the prior revision, same mechanism as the app                                                                                            |

## First-deploy bootstrap sequence (staging and prod, each performed once per project)

1. Create the Firebase project, enable Firestore (Native mode), Storage, Auth, Functions.
2. Deploy rules, indexes, and functions (steps 2–4 above) before any app traffic.
3. Run the admin bootstrap script (OQ-4) to create the first `ADMIN_TELKOMSEL` account and set its custom claim — documented as a one-off, run by the project owner, never exposed as an in-app flow.
4. Run the seed importer (`pnpm seed`) against the target project, and confirm its reconciliation report matches `docs/reports/seed-reconciliation.md`'s `96/96/0/0/96` result before proceeding.
5. Configure `config/payment`, `config/packages` (confirm prices before prod), and `config/universities` via the admin panel.
6. Deploy the app (step 5 above).
7. Run the smoke tests.
