# DATA_MODEL.md

Firestore Native mode. Field names are `snake_case` at rest, matching the specification's own naming (§8) exactly where the spec defines a field. All timestamps are server-generated (`FieldValue.serverTimestamp()` or a value read from `Timestamp.now()` inside a transaction) — a client-supplied timestamp is never trusted or accepted.

## Collection: `numbers/{numberId}`

Document ID **is** the phone number (spec §8.1) — this is deliberate: it makes "does this number exist" an O(1) document read and makes it structurally impossible to create two documents for the same number.

| Field                 | Type      | Nullable | Written by                                                                                                                                            | Notes                                                                                                                                                             |
| --------------------- | --------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `number`              | string    | no       | seed importer only                                                                                                                                    | E.164-normalised is _not_ used here — this is the raw `08...` display form, since it's also the document ID                                                       |
| `status`              | enum      | no       | `reserveNumber`, `cleanupExpiredReservations`, `submitOrder`, `adminVerifyPayment`, `adminRejectPayment`, `adminMarkSoldOffline`, `adminUpdateNumber` | `available \| reserved \| pending \| sold \| sold_offline` — five values, ADR-003                                                                                 |
| `reserved_at`         | timestamp | yes      | `reserveNumber`                                                                                                                                       | null when not reserved                                                                                                                                            |
| `reserved_until`      | timestamp | yes      | `reserveNumber`                                                                                                                                       | null when not reserved; the lazy-expiry predicate's input                                                                                                         |
| `session_id`          | string    | yes      | `reserveNumber`                                                                                                                                       | opaque CSPRNG value, matches the httpOnly cookie; null when not reserved                                                                                          |
| `reservation_id`      | string    | yes      | `reserveNumber`                                                                                                                                       | **addition** (B062/B063) — distinct from `order_ref`; lets `validateReservation` distinguish this session's still-live reservation from a takeover by a later one |
| `order_ref`           | string    | yes      | `reserveNumber`                                                                                                                                       | **addition beyond spec** — minted at reservation time per ADR-005/C7, not at submission                                                                           |
| `tracking_token_hash` | string    | yes      | `reserveNumber`                                                                                                                                       | **addition** — SHA-256 of the tracking token; plaintext is never stored (ADR-005)                                                                                 |
| `sold_at`             | timestamp | yes      | `adminVerifyPayment`, `adminMarkSoldOffline`                                                                                                          | set when status becomes `sold` or `sold_offline`                                                                                                                  |
| `sold_channel`        | enum      | yes      | same as above                                                                                                                                         | **addition** — `online \| offline`, so an `ADMIN_TELKOMSEL` view can distinguish channel without inferring it from `status` alone                                 |
| `updated_at`          | timestamp | no       | every write                                                                                                                                           | auto-updated on every write, per spec                                                                                                                             |

**Additions beyond the spec's §8.1 table**, each justified above: `order_ref`, `tracking_token_hash`, `sold_channel`, `reservation_id`.

## Collection: `orders/{orderId}`

Document ID auto-generated (spec §8.2).

| Field                       | Type          | Nullable | Written by                                                        | Notes                                                                                                                                                                                                                                                                                                          |
| --------------------------- | ------------- | -------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `number`                    | string        | no       | `submitOrder`                                                     | must reference an existing `numbers` document (spec constraint; enforced at write time inside the transaction, not by a Firestore-native FK)                                                                                                                                                                   |
| `order_ref`                 | string        | no       | `submitOrder` (copied from the `numbers` doc at reservation time) | **addition** — indexed, this is the public lookup key                                                                                                                                                                                                                                                          |
| `tracking_token_hash`       | string        | no       | `submitOrder` (copied)                                            | **addition** — see `numbers.tracking_token_hash`                                                                                                                                                                                                                                                               |
| `session_id`                | string        | no       | `submitOrder`                                                     | must match `numbers.session_id` at submission time (spec constraint)                                                                                                                                                                                                                                           |
| `full_name`                 | string        | no       | `submitOrder`                                                     | 2–100 chars                                                                                                                                                                                                                                                                                                    |
| `university`                | string        | no       | `submitOrder`                                                     | must exist in `config/universities`                                                                                                                                                                                                                                                                            |
| `whatsapp`                  | string        | no       | `submitOrder`                                                     | **stored E.164-normalised** (`+628...`), display-formatted to `08...` at read time — addition/clarification per C5, since the spec's `08xxxxxxxxxx` constraint describes the _display_ format the design also uses a `+62`-prefixed input for                                                                  |
| `email`                     | string        | no       | `submitOrder`                                                     | valid email format                                                                                                                                                                                                                                                                                             |
| `package_id`                | string        | no       | `submitOrder`                                                     | must exist in `config/packages`                                                                                                                                                                                                                                                                                |
| `payment_proof_path`        | string        | no       | `submitOrder`                                                     | **renamed from spec's `payment_proof_url`** — a private Storage _path_, not a durable URL, since access is always via a freshly-minted signed URL (ADR-006); a stored "URL" would either be wrong (bucket paths aren't fetchable without a token) or would leak a permanent public link if ever built that way |
| `status`                    | enum          | no       | `submitOrder`, `adminVerifyPayment`, `adminRejectPayment`         | `pending \| verified \| rejected`                                                                                                                                                                                                                                                                              |
| `submitted_at`              | timestamp     | no       | `submitOrder`                                                     | auto-set on creation                                                                                                                                                                                                                                                                                           |
| `verified_at`               | timestamp     | yes      | `adminVerifyPayment`, `adminRejectPayment`                        | set on either admin action (spec only mentions verify; rejection also needs a timestamp for the same reason — audit)                                                                                                                                                                                           |
| `verified_by`               | string        | yes      | same                                                              | admin UID, not display name (audit + no accidental PII exposure in logs)                                                                                                                                                                                                                                       |
| `admin_note`                | string        | yes      | `adminVerifyPayment`, `adminRejectPayment`                        | optional, e.g. rejection reason                                                                                                                                                                                                                                                                                |
| `price_at_order`            | integer (IDR) | no       | `submitOrder`                                                     | **addition** — snapshot of the package price at order time, so a later price change never retroactively alters what a student is shown they owe                                                                                                                                                                |
| `created_at` / `updated_at` | timestamp     | no       | every write                                                       | **addition** — standard audit pair, `created_at` immutable after `submitOrder`                                                                                                                                                                                                                                 |

**Additions beyond spec's §8.2 table**: `order_ref`, `tracking_token_hash`, `price_at_order`, `created_at`/`updated_at`; `payment_proof_url` renamed to `payment_proof_path` with rationale above.

## `config/payment`

| Field           | Type      | Notes                                                                                                                                                                                                                                                          |
| --------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qr_image_path` | string    | Storage path to the admin-uploaded QRIS image (spec calls this `qr_image_url`; renamed for the same reason as `payment_proof_path` — served via a signed or public-cacheable admin-controlled asset URL generated at read time, not stored as a permanent URL) |
| `payment_label` | string    | e.g. "QRIS Telkomsel Kampus"                                                                                                                                                                                                                                   |
| `updated_at`    | timestamp |                                                                                                                                                                                                                                                                |

## `config/packages`

| Field        | Type             | Notes     |
| ------------ | ---------------- | --------- |
| `packages[]` | array of objects | see below |
| `updated_at` | timestamp        |           |

Each package object — **extended well beyond spec's `(id, label, price)`** per C2/C3, since the design requires all of these fields to render a package card:

| Field               | Type          | Notes                                                                                                     |
| ------------------- | ------------- | --------------------------------------------------------------------------------------------------------- |
| `id`                | string        | `pkg_70gb` … `pkg_300gb` — stable, spec-mandated IDs                                                      |
| `label`             | string        | e.g. "Halo+ 100K"                                                                                         |
| `price`             | integer (IDR) | draft values seeded from the design reference                                                             |
| `price_status`      | enum          | `draft \| confirmed` — **addition**, gates production readiness (Assumption A3 / OQ-1)                    |
| `quota_internet_gb` | integer       | 70/120/160/220/300                                                                                        |
| `quota_roaming_gb`  | integer       | 1/2/2/3/5                                                                                                 |
| `voice_minutes`     | integer       | 200/300/400/500/1000                                                                                      |
| `sms_count`         | integer       | 200/300/400/500/1000                                                                                      |
| `recommended`       | boolean       | true only for `pkg_160gb`, matching the design's "Rekomendasi" ribbon                                     |
| `active`            | boolean       | admin can deactivate a tier without deleting it                                                           |
| `display_order`     | integer       | explicit ordering, independent of array position, so reordering doesn't require rewriting sibling indices |

## `config/universities`

| Field        | Type                                         | Notes                                                                                                                                      |
| ------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `list[]`     | array of `{ name: string, active: boolean }` | **structure addition** — spec says just `list[]`; `active` lets an admin retire an entry without deleting order history that references it |
| `updated_at` | timestamp                                    |                                                                                                                                            |

## `config/system` — new document, per C20

No home exists in the spec's three `config` documents for these values, all of which the reservation and upload logic need:

| Field                                 | Type            | Notes                                                  |
| ------------------------------------- | --------------- | ------------------------------------------------------ |
| `reservation_ttl_minutes`             | integer         | default 15 (Assumption A1)                             |
| `max_active_reservations_per_session` | integer         | default 1 (Assumption A5)                              |
| `proof_max_size_mb`                   | integer         | default 5 (spec §10)                                   |
| `proof_allowed_mime_types`            | array of string | `["image/jpeg", "image/png", "image/webp"]` (spec §10) |
| `updated_at`                          | timestamp       |                                                        |

## Collection: `sessions/{sessionId}` — new collection, addition (B061)

Document ID is the 32-byte CSPRNG session ID minted into the `httpOnly` cookie (`src/server/framework/session.ts`); the client never reads or supplies it directly. Exists so `reserveNumber`'s A5 check ("does this session already hold a live reservation on a different number?") is an O(1) document read inside the reservation transaction, rather than a query across `numbers` on an unindexed `session_id` field.

| Field                 | Type          | Nullable | Written by                                     | Notes                                                                                                                      |
| --------------------- | ------------- | -------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `created_at`          | timestamp     | no       | first contact (`getOrCreateSession`)           |                                                                                                                            |
| `last_seen_at`        | timestamp     | no       | every write-path touch                         | deliberately **not** touched by read-only operations (`validateReservation`)                                               |
| `current_reservation` | map, nullable | yes      | `reserveNumber`, `releaseReservation`, cleanup | `{ number, reservation_id }`; the single source of truth for A5, kept in lockstep with the `numbers` document it points at |

## Auxiliary: `idempotency_keys/{key}` — new collection, addition

Required for the idempotency guarantees `AGENTS.md`/`API_SPEC.md` mandate on `reserveNumber` and `submitOrder`. Short-lived (TTL policy, ~1 hour) documents mapping a client-supplied idempotency key to the operation's result, so a retried request returns the original result instead of double-executing.

| Field        | Type      | Notes                         |
| ------------ | --------- | ----------------------------- |
| `operation`  | string    | e.g. `reserveNumber`          |
| `result`     | map       | the original response payload |
| `created_at` | timestamp | drives the TTL policy         |

## Auxiliary: `rate_limits/{bucketKey}` — new collection, addition

Firestore-based rate limiting (Assumption A6 — no dedicated infra needed at campus scale) for reservation attempts and tracking lookups, keyed by a hash of IP + operation. TTL-expired, counter-based.

## Auxiliary: `audit_log/{id}` — new collection, addition

The permanent record of every trusted-tier mutation (ADR-010, B058) — distinct from operational logs, which rotate out of retention. Auto-ID, append-only, written inside the same transaction as the mutation it describes. Currently populated by the admin number-management operations; extended to orders/config as those trusted-tier operations land.

| Field         | Type         | Notes                                                         |
| ------------- | ------------ | ------------------------------------------------------------- |
| `actor_uid`   | string       | the acting admin's UID, never a display name                  |
| `actor_role`  | enum         | `ADMIN_KAMPUS \| ADMIN_TELKOMSEL`                             |
| `action`      | string       | e.g. `adminAddNumbers`, `adminMarkSoldOffline`                |
| `entity_type` | string       | e.g. `number`                                                 |
| `entity_id`   | string       | the mutated document's ID at the time of the action           |
| `before`      | map, null    | the entity's state before the mutation; `null` for a creation |
| `after`       | map, null    | the entity's state after the mutation; `null` for a deletion  |
| `reason`      | string, null | admin-supplied justification; `null` where not collected      |
| `created_at`  | timestamp    |                                                               |

## Document ID strategies

- `numbers`: the phone number itself.
- `orders`: Firestore auto-ID; `order_ref` is the _public_ identifier, indexed separately, never used as the document ID (so the internal ID and the public reference can have different guessability properties — the auto-ID is never exposed to the client at all).
- `config`: fixed known IDs (`payment`, `packages`, `universities`, `system`) under the `config` collection.
- `sessions`: the session ID itself (the same opaque value stored in the `httpOnly` cookie).

## Required composite indexes

| Index                                                     | Query it serves                                                 |
| --------------------------------------------------------- | --------------------------------------------------------------- |
| `numbers`: `status ASC, updated_at DESC`                  | `cleanupExpiredReservations` scan; admin inventory filter       |
| `orders`: `status ASC, submitted_at DESC`                 | `adminListOrders` default queue view                            |
| `orders`: `order_ref ASC, tracking_token_hash ASC`        | `getTrackingStatus` lookup                                      |
| `orders`: `university ASC, submitted_at DESC`             | admin filter by university                                      |
| `numbers`: `status ASC, reserved_until ASC`               | `listExpiredReservations` (the janitor's input, B050)           |
| `orders`: `status ASC, university ASC, submitted_at DESC` | `adminListOrders` when both filters are applied together (B053) |

## Invariants (checkable propositions)

1. **One-owner invariant:** for any `numberId`, at most one of {a live `numbers` reservation (`status='reserved' AND reserved_until > now`), a `pending` order referencing it, a `sold`/`sold_offline` state} is true at any instant. Verified by the concurrency test suite (`TEST_PLAN.md`), not by inspection.
2. **No orphan orders:** every `orders.number` value corresponds to a `numbers` document that is or was, at submission time, reserved by that order's `session_id`.
3. **Timestamps are monotonic per document:** `updated_at >= created_at` (or `submitted_at`) always; enforced by always writing `updated_at` via `serverTimestamp()` in the same write as any other field change.
4. **`tracking_token_hash` is never queryable in reverse:** no code path ever attempts to enumerate orders by hash prefix or partial match — lookups are always exact-match on the full hash.
