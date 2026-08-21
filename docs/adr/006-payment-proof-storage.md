# ADR-006: Payment Proof Storage

**Status:** Accepted
**Date:** 2026-08-20
**Owning blocks:** B022, Phase 8 (B078–B084)

## Context

Spec §10 requires JPG/PNG/WEBP, max 5MB, private access, naming `proofs/{orderId}-{timestamp}.{ext}`, retention "indefinite (define cleanup policy post-launch)." Master prompt §12/§24 requires PII minimisation and treats payment proofs as sensitive. The design reference (`pembayaran_updated_theme/code.html`) ships a dropzone with zero upload wiring (C22) — this is greenfield implementation, not a traced pattern.

## Decision

Private Cloud Storage bucket, no public read rule, ever. Path convention as specified: `proofs/{orderId}-{timestamp}.{ext}`. Upload is **server-mediated only** — students (unauthenticated) never receive Storage write credentials; the file travels as `multipart/form-data` to the `submitOrder` Route Handler, which validates it (magic-byte type check, size limit from `config/system`) and then **decodes and re-encodes it via `sharp`** before writing to Storage. Admin viewing goes through `adminGetProofUrl`, which mints a 5-minute signed URL after the role check — proofs are never referenced by a durable/permanent URL anywhere in the system (`DATA_MODEL.md` stores a `payment_proof_path`, not a URL).

**Retention:** 90 days after the owning order reaches a terminal state (`verified` or `rejected`); the order record itself is retained indefinitely, only the image is deleted. This is a default, not a fixed constraint — overridable per OQ-8 if the business specifies a different requirement.

## Alternatives considered

- **Client-direct upload to Storage via a scoped anonymous Firebase Auth session.** Rejected — this would either require public/anonymous write rules (unacceptable for a bucket holding financial-proof images with no further server-side check possible before the write) or a per-student Firebase Auth session, which reintroduces the login requirement REQ-NG-001 explicitly excludes.
- **Extension/MIME-header check alone, no re-encoding.** Rejected — this is the "theatre" case `SECURITY.md` calls out: a client can set any extension or `Content-Type` header it wants, and even a correct magic-byte check only confirms the _first bytes_ look like a valid image, not that the entire file is nothing else. Decoding and re-emitting via `sharp` is the actual control: a polyglot file (valid image header + trailing script payload) fails to survive re-encoding intact, because re-encoding only ever emits pixel data it actually decoded.
- **Public signed URLs with a long expiry (e.g. 24 hours), cached client-side.** Rejected in favour of a 5-minute expiry minted per view — a long-lived signed URL that leaks (browser history, a screenshot, a shared link) remains exploitable for its full window; 5 minutes is long enough for an admin to view one proof, short enough that a leaked URL is nearly always already expired by the time it could be misused.
- **Indefinite retention, as spec §10 literally allows.** Rejected per master prompt §24's minimisation requirement — proof images are the single most sensitive artefact in this system (financial screenshot, possibly bank details, possibly still-present EXIF/GPS before re-encoding strips it) and there is no ongoing product need to keep them past the point an order's outcome is settled.

## Consequences

A proof requested after its 90-day window returns a clean "no longer available" state (`RUNBOOK.md` procedure 4) rather than an error — an accepted, documented limitation. Re-encoding costs a small amount of CPU per upload, accepted given upload volume is bounded by campus-scale order volume (Assumption A6).

## Verification

Integration test uploading a crafted polyglot file and asserting the stored object, when re-decoded, contains no non-image payload. Unit test on the size/MIME validators. A scheduled cleanup job (separate from the reservation janitor) enforcing the 90-day retention window, with its own test coverage.
