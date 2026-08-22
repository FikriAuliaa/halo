# Phases 7-9 Progress Note (student ordering flow, payment, tracking)

Per the "don't test/commit every block" direction, this covers B071-B085 plus `getTrackingStatus` (originally later in the plan, pulled forward since the confirmation/tracking pages needed it to be a complete flow) as one batch, verified live rather than block-by-block.

## Built

- **B071** — routing skeleton (`/`, `/paket`, `/data`, `/bayar`, `/konfirmasi`, `/lacak`), `src/lib/flow-state.ts` (sessionStorage convenience state), `src/server/guards/require-reservation.ts` (server-side flow guard — reservation truth always re-asked of `validateReservation`, never trusted from the client).
- **B072-074** — number selection screen (`NumberList`) with search (debounced, cancelled via `AbortController`), refresh, loading/empty/error states, and the reservation race handled as a toast, not a crash. `useReservation`/`useCountdown` extended with clock-offset correction (`now()`) so a device with a wrong clock still counts down accurately — verified against `reserveNumber`'s new `now` field.
- **B075** — `scripts/seed-config.ts` (packages, universities, system, and a payment placeholder), `getPackages`/`GET /api/packages`. Five packages seeded from the design's own price points, `pkg_160gb` the only `recommended: true`.
- **B076-077** — package scroller, stale-selection handling (cleared + explained if a previously-picked package went inactive), the non-interactive "Pilih 1 Extra Benefit" chip (C4/A4 — no benefit catalogue exists, so it selects nothing on purpose).
- **B078-079** — `getUniversities` (also the server-side allowlist `submitOrder` checks against), personal data form with shared-schema validation on blur, `useFormDraft` (sessionStorage, namespaced by `order_ref`, form input only — never reservation state or the tracking token).
- **B081-082** — `getPaymentConfig` (public Supabase Storage bucket for the QRIS asset — unlike proofs, this one's meant to be publicly visible), order summary with copy-to-clipboard + fallback.
- **B083** — `validate-image.ts` (magic-byte sniffing) + `upload-proof.ts` (sharp decode-and-**re-encode**, which is what actually destroys a polyglot payload and EXIF/GPS — the sniff only gates whether it's worth trying). Private `proofs` Storage bucket.
- **B084** — `FileUploader` wired via `XMLHttpRequest` (not `fetch`, which has no upload-progress event) with real progress, cancel via `.abort()`, and retry that reuses the same idempotency key so a request that actually succeeded is never duplicated.
- **B085** — `submitOrder`: re-validates the reservation, package, and university server-side regardless of client claims; `order_ref`/`tracking_token_hash` are copied from the reservation (never re-minted); transactional; a failed transaction after a successful upload logs an `orphaned_proof` event rather than losing the object silently.
- **Tracking** — `getTrackingStatus`, `POST /api/track` (dual rate limit, per-IP and per-`order_ref`, both fail-closed per ADR-005), `/lacak` lookup UI, `/konfirmasi` confirmation screen.

## Live end-to-end verification

Ran the actual `next dev` server against a real (throwaway, Docker) Postgres, walking the flow with `curl` and a cookie jar across process restarts:

`GET /` → real number list rendered → `POST /api/numbers/{id}/reserve` → `GET /paket` (guard passes, real seeded packages render, including `Halo+ 150K`) → `GET /data` (real seeded universities render) → `GET /bayar` (real payment placeholder label renders) → `GET /paket` with **no** session correctly 307-redirects to `/?reason=no-reservation`, and that reason banner renders. `/lacak` renders; `POST /api/track` with a bogus ref returns a uniform `404 NOT_FOUND`; an unauthenticated admin route returns `401 UNAUTHENTICATED`.

**Found and fixed during this verification**: a stale `src/app/page.tsx` bootstrap placeholder from Phase 2/3 was silently shadowing the real `src/app/(student)/page.tsx` at `/` — Next.js didn't error on the conflict, it just rendered the old placeholder. Would have shipped a broken homepage undetected without the live check. Also fixed: `scripts/seed-numbers.ts` never exited after a successful run (`postgres.js`'s connection pool keeps the process alive; the old Firestore-based version didn't have this problem) — now calls `process.exit(0)` explicitly, matching `seed-config.ts`.

## Explicitly not done in this pass

- Pixel-parity verification against reference screenshots — **no reference assets exist in this repository** (confirmed by search); screens were built from `DESIGN.md`'s token/spec descriptions instead.
- Playwright E2E suites, axe audits per screen, component test files per block — deferred to the dedicated Testing phase, per the same direction as the Phase 6 gate.
- The full multipart upload path (`submitOrder` end-to-end including a real file landing in Storage) was **not** exercised live — the throwaway Postgres container has no real Supabase Storage service behind it, only a stub `storage.buckets`/`storage.objects` table for the bucket-creation migration to apply against. This is the one piece of B083-085 still unverified against a live system; flagging it explicitly rather than claiming full coverage.

## Verdict

The reservation-guarded flow (number → package → data → payment page) is real, live-verified, and coherent end to end, including the guard's redirect behavior. The final upload+order-creation step is implemented and typechecked/built but not live-verified (Storage dependency). Proceeding to admin auth/dashboard (Phase 10+).
