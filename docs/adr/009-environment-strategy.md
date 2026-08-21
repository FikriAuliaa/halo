# ADR-009: Environment Strategy

**Status:** Accepted
**Date:** 2026-08-20
**Owning blocks:** B023, B029, `DEPLOYMENT.md`

## Context

The system handles real student PII (name, WhatsApp, email) and financial-proof images from first production use. A mistake in one environment must not be able to touch another environment's real data.

## Decision

Three environments — `dev` (Firebase Emulator Suite, no real Firebase project), `staging` (a dedicated Firebase project, synthetic/scrubbed data only), `prod` (a dedicated Firebase project, real data) — each its **own Firebase project**, not a shared project with collection-name prefixes. Promotion is strictly one-directional: `dev → staging → prod`, no environment is ever skipped for a change touching data model, security rules, or the reservation/order flow. Data-handling rules per environment: `dev` data is disposable and freely reset; `staging` data must never contain real student PII (seeded/synthetic only); `prod` data follows the retention and minimisation rules in `SECURITY.md`/ADR-006.

## Alternatives considered

- **One Firebase project, `dev_`/`staging_`/`prod_` collection prefixes.** Rejected — a single IAM boundary means a rules mistake, a leaked service account, or a bad admin action in one "environment" can reach another environment's real data; the entire point of environment separation is to bound that blast radius, which a shared project cannot do.
- **Two environments only (staging folded into prod with a feature flag).** Rejected — this would mean testing security-rules changes, index changes, or Cloud Function deploys against real student data before they're verified, which is precisely the risk staging exists to absorb.

## Consequences

Three sets of Firebase configuration, three sets of secrets, three deploy targets to keep in sync (`DEPLOYMENT.md`'s build/deploy sequence runs once per environment on promotion). Slightly more operational overhead than a single project, accepted as the cost of a real blast-radius boundary.

## Verification

`DEPLOYMENT.md`'s environment table and first-deploy bootstrap sequence; a CI check confirming the deploy target's project ID matches the expected environment before any deploy step runs, to prevent an accidental cross-environment deploy.
