# Phase 14 Verification Gate (B113-B118: Hardening)

Per the same batched-verification direction as prior phase gates, with one structural note: B113-B118 as originally written assume Firebase (`firestore.rules`, `storage.rules`, Firebase App Check). This project migrated to Supabase/Postgres mid-build (see the Phase 6 gate); every block below is executed against what that migration actually produced, not against Firebase artifacts that no longer exist.

## B113 — RLS audit (Firestore/Storage rules equivalent)

There are no hand-written rule files to audit — the Postgres/Supabase equivalent of "deny-by-default" is RLS **enabled with zero policies** on every table (`supabase/migrations/20260101000000_init.sql`), a stronger and simpler property than a rules DSL: there is no exception to audit, because none exists. Verified live with the actual local anon key (the one credential a leaked client config could expose) against all eight tables and both Storage buckets:

- `config`, `numbers`, `orders`, `sessions`, `audit_log`, `idempotency_keys`, `rate_limits`, `admin_users` — every one returns `401 permission denied` for the anon role, both for reads and writes.
- Private `proofs` bucket — `list` returns an empty array (RLS silently filters rather than erroring); a direct `GET` on a known, real object returns `400`/effectively not-found; `POST .../sign/...` for that same real object returns `404 Object not found` — RLS makes the row invisible before storage-api can even confirm it exists, which is the right failure shape (never confirms existence to an unauthorized caller).
- Public `payment-assets` bucket — anonymous `GET` succeeds (by design), anonymous upload is refused with `403 "new row violates row-level security policy"`.

**Verdict**: a leaked anon key grants nothing meaningful. No unjustified exception exists because RLS has no policies to begin with.

## B114 — Firebase App Check: not applicable

Firebase App Check has no Supabase equivalent and does not apply post-migration (JANGAN PAKAI FIREBASE). Documented explicitly in `SECURITY.md` rather than silently dropped: the actual controls against scripted abuse are the rate limits (B115) and the fact that no client ever holds a credential capable of reaching the database or Storage directly.

## B115 — Abuse prevention review

Reviewed every existing limit against realistic campus usage (see the table now in `SECURITY.md`). Found and fixed one real gap: `reserveNumber` was rate-limited **only** per session, and `sessionId` is a client-supplied cookie value — nothing stopped a script from minting a fresh session per request to reset that budget every time, making the per-session limit alone not an actual bound on one actor's total reservation churn. Added a second, much looser per-IP limit (100/min, layered behind the existing 10/min per-session limit) sized specifically per B115's own constraint — tight enough to matter against a single address spamming sessions, loose enough that a real shared-NAT campus network full of legitimate students each within their own budget never notices it. True simultaneous hoarding (holding many numbers at once) remains structurally impossible regardless of rate limits, since a session may hold at most one live reservation (verified live in Phase 6).

No change was made to the other five limits — each was already sized and keyed correctly for its actual abuse shape (per-IP for the two brute-force surfaces, tracking and admin login; per-session for the two fairness-sensitive write paths, reserve and submit).

## B116 — Security headers and CSP

Added to `src/middleware.ts` (widened from an admin-only matcher to run on every request): a nonce-based `Content-Security-Policy` (`strict-dynamic`, no `unsafe-inline` for scripts, `frame-ancestors 'none'`, `object-src 'none'`), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Permissions-Policy` denying camera/microphone/geolocation, and `Referrer-Policy` (`no-referrer` specifically on `/lacak`, `strict-origin-when-cross-origin` elsewhere).

One real bug found while building this: middleware runs in the Edge runtime, which doesn't support `node:crypto` — the first implementation attempt broke every page with a 500 (`UnhandledSchemeError: Reading from "node:crypto" is not handled`). Fixed by generating the nonce with the standard Web Crypto API (`crypto.getRandomValues`) instead.

**Live verification**: restarted `next dev` clean and walked every student route (`/`, `/paket`, `/data`, `/bayar`, `/lacak`, `/konfirmasi`), the admin login page, and the full admin login → dashboard flow. All headers present on every response; Next.js automatically applied the per-request nonce to every script tag it injects (confirmed by grepping the actual served HTML); no route that previously worked broke. This project has no reference screenshots or a real browser available in this environment to literally "open devtools and check for zero console violations" per the block's `VERIFY` step — the closest available substitute (every route still renders, loads its scripts, and completes its normal flows with the policy _enforcing_, not report-only) was performed instead, and is recorded here as the honest scope of what was checked.

## B117 — Secrets and PII audit

Full report: `SECURITY.md`'s "Secret management," "PII inventory," and "Log redaction" sections were rewritten with live-verified claims, not carried forward from the pre-migration text. Highlights:

- `git grep` across the tracked repo for common secret patterns and for the actual local dev service-role key/DB password: clean. `.env*` is gitignored except `.env.example`, which has no real values.
- Grepped the actual **built** `.next` output (not just source) for the same secret values: clean.
- **Found and fixed a real gap**: `src/lib/env.ts` — the module responsible for fail-fast env validation — was never actually imported anywhere in the codebase, despite its own doc comment asserting that `db/client.ts` and `supabase-admin.ts` "trust this module to have already failed if something is missing." Fixed by adding the side-effect import to both files.
- **Found and removed dead, misleading config surface**: `publicEnv` (`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`) was declared and schema-validated but never consumed anywhere — this architecture has no client-side Supabase code at all. Removed the schema, the export, its test case, and the corresponding `.env.example` lines rather than leave unused-but-plausible-looking public config lying around.
- Live PII/log-redaction check: submitted a real order with a distinctive full name, email, and WhatsApp number, then grepped the actual server log output — zero occurrences of any of the three values. Separately confirmed a real tracking token (from an actual reservation) never appears in server output either.

## B118 — Phase 14 gate

`SECURITY.md` was substantially rewritten (not incrementally patched) to match the real Supabase-based implementation — the previous version described Firestore rules, Firebase Auth, Firebase App Check as "enabled," and Firestore-based rate-limit counters, none of which describe the system as it now exists. Every threat-model row was re-verified live rather than carried forward.

### Full suite

`pnpm run typecheck` / `lint` / `next build` clean; `pnpm run test` — 361/361 passing.

## Deferred

- A formal, automated "rules test suite" (B113's literal ask) doesn't map onto a zero-policy RLS design — there is nothing parameterized to test beyond "every table/bucket denies the anon role," which was verified live instead, once, comprehensively, rather than as a maintained suite. Could be encoded as a standing integration test in the dedicated Testing phase if desired.
- CSP was deployed directly in enforcing mode rather than the staged report-only-then-enforce rollout B116 describes — this environment has no real users or monitoring pipeline to observe report-only violations against; the live walk-every-route check above is the practical substitute available here.
- The 90-day payment-proof retention policy (OQ-8, already documented in `SECURITY.md`) has no automated cleanup job yet — confirmed via grep that no such job exists. Recorded as a known limitation, not fixed in this pass.

## Verdict

Every threat this system's design already claimed to mitigate was re-verified against the real, running Supabase-backed implementation rather than assumed still true after the migration. Two genuine, previously-undetected gaps were found and fixed in the process (the unused `env.ts` validation, the missing per-IP reservation backstop) — exactly the value a real audit pass is supposed to produce. Proceeding to Phase 15 (Testing).
