# API_SPEC.md — Trusted Server Operation Contracts

Every mutating and privileged-read operation in this system is one Route Handler. All are versioned under `/api/`. All responses use the error envelope below; all mutations state their idempotency behaviour explicitly.

## Error envelope

```json
{
  "error": {
    "code": "NUMBER_UNAVAILABLE",
    "message": "This number is no longer available.",
    "field": null
  }
}
```

`code` is a stable machine string from the table below. `message` is safe, translated (Indonesian for student-facing, may be more technical for admin-facing), and never leaks Firestore/Storage internals. `field` is populated only for `VALIDATION_FAILED`, naming the offending form field.

## Central error code enumeration

| Code                    | HTTP | Meaning                                                                                                                              |
| ----------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `NUMBER_UNAVAILABLE`    | 409  | The requested number is not available to reserve                                                                                     |
| `RESERVATION_EXPIRED`   | 410  | The caller's reservation has lapsed                                                                                                  |
| `RESERVATION_NOT_FOUND` | 404  | No active reservation matches the session                                                                                            |
| `SESSION_MISMATCH`      | 403  | The session cookie doesn't match the reservation's owner                                                                             |
| `INVALID_FILE_TYPE`     | 422  | Uploaded file fails the magic-byte check                                                                                             |
| `FILE_TOO_LARGE`        | 413  | Uploaded file exceeds `config/system.proof_max_size_mb`                                                                              |
| `VALIDATION_FAILED`     | 422  | A form field failed schema validation                                                                                                |
| `NOT_FOUND`             | 404  | Generic resource not found (also used for tracking lookups, deliberately, to avoid leaking which half of a ref+token pair was wrong) |
| `FORBIDDEN`             | 403  | Authenticated but lacking the required role                                                                                          |
| `UNAUTHENTICATED`       | 401  | No valid ID token on an admin route                                                                                                  |
| `RATE_LIMITED`          | 429  | Too many attempts from this bucket                                                                                                   |
| `CONFLICT`              | 409  | A concurrent write beat this one (e.g. order already actioned)                                                                       |
| `INTERNAL`              | 500  | Unexpected server error — message is always the same generic string regardless of cause                                              |

## Student-facing operations

### `getAvailableNumbers`

`GET /api/numbers?limit=12&suffix=<optional>` · No auth. · Returns a randomised sample of AVAILABLE numbers (lazy-expiry-evaluated), optionally filtered by trailing-digit suffix. · No side effects. · Idempotent (read-only). · Rate limit: 60/min per IP.
Response: `{ numbers: [{ id, number }] }`.

### `reserveNumber`

`POST /api/numbers/{id}/reserve` · No auth (sets session cookie if absent). · Body: `{ idempotency_key }`. · Transactional write per `ARCHITECTURE.md`. · Errors: `NUMBER_UNAVAILABLE`, `RATE_LIMITED`, `VALIDATION_FAILED`. · **Idempotent**: replaying the same `idempotency_key` within its TTL returns the original reservation result rather than attempting a second reservation (`tracking_token` included, unchanged). · A5 (one live reservation per session) is enforced by the same `NUMBER_UNAVAILABLE` code — the response carries no separate status for "you already hold a different number," since the client-facing remedy is identical (pick a different number, or finish/release the existing one). · Re-requesting the _same_ number the session already holds (different `idempotency_key`, e.g. the student navigated back and re-selected it) returns the existing reservation unchanged with `tracking_token: null` — the original plaintext was already delivered once and is cryptographically unrecoverable (only its hash is ever persisted, ADR-005). · Side effects: `numbers/{id}` → reserved, mints `order_ref` + tracking token, sets the session cookie. · Rate limit: 10/min per session.
Response: `{ order_ref, tracking_token, reserved_until, number }`.

### `validateReservation`

`GET /api/reservations/current` · Session cookie required. · Read-only, applies the lazy-expiry predicate. · Errors: `RESERVATION_NOT_FOUND`, `RESERVATION_EXPIRED`. · Idempotent.
Response: `{ number, reserved_until, order_ref, status }`.

### `releaseReservation`

`POST /api/reservations/current/release` · Session cookie required. · Voluntary early release (e.g. student changes their mind before the form step). · Transactional: reserved→available only if still owned by this session. · Errors: `RESERVATION_NOT_FOUND`, `SESSION_MISMATCH`. · Idempotent (releasing twice is a no-op the second time).

### `getPackages` / `getUniversities` / `getPaymentConfig`

`GET /api/packages`, `GET /api/universities`, `GET /api/payment-config` · No auth. · Read-only projections of the respective `config/*` documents, filtered to `active` entries. · Idempotent. · Cached at the edge for 60s.

### `submitOrder`

`POST /api/orders` (multipart/form-data: form fields + `proof` file, `idempotency_key`, session cookie). · Validates session ownership and reservation non-expiry, Zod-validates fields, magic-byte + size validates the file, re-encodes via `sharp`, writes Storage then the Firestore transaction (numbers reserved→pending, orders create). · Errors: `RESERVATION_EXPIRED`, `SESSION_MISMATCH`, `VALIDATION_FAILED`, `INVALID_FILE_TYPE`, `FILE_TOO_LARGE`. · **Idempotent** via `idempotency_key` — a retried multipart POST (e.g. after a client timeout) returns the original `order_ref` rather than creating a duplicate order or double-consuming the reservation.
Response: `201 { order_ref }`.

### `getTrackingStatus`

`POST /api/track` · Body: `{ order_ref, tracking_token }`. · No auth. · Hashes the token, exact-match query. · Errors: `NOT_FOUND` (used uniformly for "ref doesn't exist" and "token doesn't match" — never distinguished in the response). · Idempotent. · Rate limit: 20/min per IP, keyed also by `order_ref` to slow down token-guessing against one specific ref.
Response: `{ status, number, package_label, submitted_at, verified_at, admin_note (only if rejected) }`.

## Admin operations (all require a valid Firebase ID token; role required as noted)

### `adminListOrders`

`GET /api/admin/orders?status=&university=&cursor=` · Role: either admin role. · Paginated, filterable, sortable by `submitted_at`. · Idempotent.

### `adminGetOrder`

`GET /api/admin/orders/{id}` · Role: either. · Full order detail, no proof URL included (fetched separately so viewing the list never mints signed URLs for entries the admin doesn't open). · Errors: `NOT_FOUND`.

### `adminGetProofUrl`

`POST /api/admin/orders/{id}/proof-url` · Role: either. · Mints a 5-minute signed URL for the order's `payment_proof_path`. · Idempotent (each call mints a fresh URL; no side effect beyond the mint itself, which is logged for audit).

### `adminVerifyPayment`

`POST /api/admin/orders/{id}/verify` · Role: either. · Transactional: `orders/{id}.status` must currently be `pending`; sets `verified`, stamps `verified_at`/`verified_by`; `numbers/{num}` → `sold`, `sold_at`, `sold_channel: 'online'`. · Errors: `CONFLICT` (already actioned by another admin), `NOT_FOUND`. · **Idempotent against replay of the same request** (retrying after a network blip when the first attempt actually succeeded returns 200 with the same result, detected via the order's status already being `verified` by _this_ admin's prior call within a short window) but a genuine second admin's concurrent verify attempt correctly gets `CONFLICT`, never a silent double-charge-equivalent action.

### `adminRejectPayment`

`POST /api/admin/orders/{id}/reject` · Role: either. · Body: `{ admin_note }`. · Symmetric to verify: `orders/{id}` → `rejected`; `numbers/{num}` → `available` (reservation fields cleared). · Errors: `CONFLICT`, `NOT_FOUND`, `VALIDATION_FAILED` (missing note).

### `adminListNumbers`

`GET /api/admin/numbers?status=&search=&cursor=` · Role: either.

### `adminAddNumbers`

`POST /api/admin/numbers` · Role: either. · Body: `{ numbers: string[] }` (single or bulk paste). · Validates format (spec §8.1: 10–13 digits, starts `08`), rejects any that already exist as a distinct, itemised per-number result rather than an all-or-nothing failure. · Errors: `VALIDATION_FAILED` (per-item detail in the response body, not the shared `field` slot).

### `adminRemoveNumber`

`DELETE /api/admin/numbers/{id}` · Role: either. · Allowed only if `status === 'available'` (spec §6.5). · Errors: `CONFLICT` (wrong status), `NOT_FOUND`.

### `adminMarkSoldOffline`

`POST /api/admin/numbers/sold-offline` · Role: `ADMIN_TELKOMSEL` only (spec §5: offline visibility is a Telkomsel-specific capability; marking is treated the same way, since it's the write side of the same concern). · Body: `{ numbers: string[] }` (1–200; RUNBOOK.md §10's bulk recap tool, not a single-number action — corrected from an earlier single-`{id}` sketch to match the shared schema and OPERATIONS.md/RUNBOOK.md, which have always described this as bulk). · Per-entry outcome (`sold_offline` / `not_found` / `conflict`), never an all-or-nothing failure. · Allowed only from an _effectively_ available number (lazy expiry applies, ADR-004) — if a reservation is still genuinely live, that entry's outcome is `conflict` rather than silently evicting the student (`PRD.md` edge case). · Transactional per entry.

### `adminUpdateNumber`

`PATCH /api/admin/numbers/{id}` · Role: either. · Body: `{ corrected_number, reason }`. · Narrow — corrections only (e.g. a typo'd digit before any reservation ever touched it: `status === 'available' && reserved_at === null`). Since the number is the document ID, a correction is implemented as a delete-and-recreate under `corrected_number`, not a field update; it never touches `status` and may not be used to force a status transition (use the dedicated verify/reject/mark-offline operations for that, so every status change has one auditable, purpose-built code path). · Errors: `NOT_FOUND`, `CONFLICT` (already reserved once, or `corrected_number` already exists), `VALIDATION_FAILED`.

### `adminManagePackages`

`PUT /api/admin/config/packages` · Role: either. · Full-document replace of `config/packages`, Zod-validated against the extended schema in `DATA_MODEL.md`. · Errors: `VALIDATION_FAILED`.

### `adminManageUniversities`

`PUT /api/admin/config/universities` · Role: either.

### `adminUpdatePaymentConfig`

`PUT /api/admin/config/payment` · Role: either. · Body includes the new QRIS image upload (multipart) or a reference to an already-uploaded asset. · Errors: `INVALID_FILE_TYPE`, `FILE_TOO_LARGE` (same limits as proof uploads).

## Scheduled operation

### `cleanupExpiredReservations`

Postgres function (`cleanup_expired_reservations`), `pg_cron` trigger every 2 minutes, no HTTP surface, no auth (invoked by the database itself, not a user). Selects and rewrites stale `reserved` rows in one atomic statement (`SELECT ... FOR UPDATE SKIP LOCKED` inside a data-modifying CTE), returning `{ scanned, released }`. Idempotent by construction — re-running against already-cleaned rows is a no-op. `adminRunCleanup` below invokes the exact same function on demand.

### `adminRunCleanup`

`POST /api/admin/cleanup/run` · Role: `ADMIN_TELKOMSEL` only (B068). · Invokes `cleanup_expired_reservations()` on demand, returning `{ scanned, released }` — the same summary shape the scheduled trigger produces, since both call the identical function.

### `adminForceReleaseReservation`

`POST /api/admin/numbers/{id}/force-release` · Role: `ADMIN_TELKOMSEL` only. · Body: `{ reason }` (mandatory). · Releases a **live** reservation — genuinely destructive to a student mid-order, so it requires a written reason and is fully audited. · Errors: `NOT_FOUND`, `CONFLICT` (not currently `reserved`), `VALIDATION_FAILED` (missing reason).

## Traceability

Every business rule in `PRD.md`'s "Functional requirements" and "Business rules" sections maps to at least one operation above: the one-owner invariant → `reserveNumber` + `adminMarkSoldOffline`'s transactional guards; the status lifecycle → the full set of transition-triggering operations; login-free tracking → `getTrackingStatus`; manual verification → `adminVerifyPayment`/`adminRejectPayment`.
