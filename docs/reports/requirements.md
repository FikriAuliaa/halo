# Requirement Register (B003)

Source: `KONTEKS PROYEK KARTU HALO DAN PAKET.md`, v1.0 July 2026.
Marker legend: **C** confirmed (stated plainly in source) · **A** assumed (source is silent or TBD) · **X** contradicted (source disagrees with itself or with the master planning prompt — see `contradiction-audit.md`).

## Background / problem (§1–§2)

| ID      | Statement                                                                                                                                             | Actor   | Category      | Marker |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------- | ------ |
| REQ-001 | Numbers sold via offline direct sales and online ordering must not collide — a number sold/reserved in one channel must not be sellable in the other. | System  | Business rule | C      |
| REQ-002 | A student can browse available numbers, reserve one, pick a package, submit basic info, and pay via a single static QR image.                         | Student | Functional    | C      |
| REQ-003 | The moment a student picks a number it is locked so no other student can pick it while the reservation is active.                                     | System  | Business rule | C      |
| REQ-004 | If the student does not complete the order before the reservation timer expires, the number is released back to the pool automatically.               | System  | Business rule | C      |
| REQ-005 | Students confirm payment by uploading a screenshot/proof image.                                                                                       | Student | Functional    | C      |
| REQ-006 | An admin panel lets an admin manually verify payments, manage the number list, and update order statuses.                                             | Admin   | Functional    | C      |

## Scope (§4)

| ID         | Statement                                                                                    | Category   | Marker                                                |
| ---------- | -------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------- |
| REQ-007    | Display available numbers from the dataset.                                                  | Functional | C                                                     |
| REQ-008    | Let a student reserve a number with a timer lock.                                            | Functional | C                                                     |
| REQ-009    | Package selection across 5 packages (70/120/160/220/300 GB).                                 | Functional | C                                                     |
| REQ-010    | Basic order form: name, university, WhatsApp, email.                                         | Functional | C                                                     |
| REQ-011    | Display a static QR image for payment.                                                       | Functional | C                                                     |
| REQ-012    | Accept uploaded payment proof image.                                                         | Functional | C                                                     |
| REQ-013    | Student order tracking without login, via email or WhatsApp.                                 | Functional | X — overridden by master prompt §7; see ADR-005 / C17 |
| REQ-014    | Admin panel: verify/reject payment, mark number sold, add/remove numbers, update order info. | Functional | C                                                     |
| REQ-NG-001 | No user accounts or login of any kind for students.                                          | Non-goal   | C                                                     |
| REQ-NG-002 | No automated payment verification / payment gateway webhook.                                 | Non-goal   | C                                                     |
| REQ-NG-003 | No real-time sync with Telkomsel's internal systems.                                         | Non-goal   | C                                                     |
| REQ-NG-004 | No mobile app.                                                                               | Non-goal   | C                                                     |
| REQ-NG-005 | No multiple payment methods.                                                                 | Non-goal   | C                                                     |
| REQ-NG-006 | No SMS or email notifications (explicitly "nice-to-have, not core").                         | Non-goal   | C                                                     |

## Actors (§5)

| ID      | Statement                                                                                                         | Marker                                         |
| ------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| REQ-015 | Student: browse, reserve & order, pay via QRIS, upload proof, track by email/WhatsApp.                            | X — tracking mechanism overridden, see REQ-013 |
| REQ-016 | Admin Kampus: verify/reject payments, add/remove numbers, update order info, mark sold, view all orders/statuses. | C                                              |
| REQ-017 | Admin Telkomsel: all Admin Kampus capabilities plus visibility of numbers sold via offline/direct sales.          | C                                              |

## Student ordering flow (§6.1)

| ID      | Statement                                                                     | Marker                                                                                                                                                      |
| ------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-018 | Landing page loads with available numbers.                                    | C                                                                                                                                                           |
| REQ-019 | Reserved/sold numbers are shown as unavailable (greyed out or hidden).        | C — implementation chooses "hidden" per B002 finding that all cards render styled the same; greyed-out treated as the DESIGN.md-specified unavailable state |
| REQ-020 | Picking a number immediately locks it for the session and starts a countdown. | C                                                                                                                                                           |
| REQ-021 | Student selects from 5 package options.                                       | C                                                                                                                                                           |
| REQ-022 | Order form collects name, university, WhatsApp, email.                        | C                                                                                                                                                           |
| REQ-023 | Payment screen shows the static QRIS image; student uploads a screenshot.     | C                                                                                                                                                           |
| REQ-024 | On submit, order is saved as PENDING and the student can track it.            | C                                                                                                                                                           |

## Reservation timer (§6.2)

| ID      | Statement                                                                                                      | Marker                                                                                                                                  |
| ------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-025 | Picking a number sets status → RESERVED, starts the timer, generates a `session_id`.                           | C                                                                                                                                       |
| REQ-026 | Completing the order before expiry saves the order as PENDING.                                                 | C                                                                                                                                       |
| REQ-027 | On order submission, the source states the number "stays RESERVED."                                            | X — contradicted by REQ-042 (§7: RESERVED → PENDING on submission). ADR-003 resolves in favour of REQ-042; see contradiction-audit C11. |
| REQ-028 | If the timer expires before submission, the number releases back to AVAILABLE and the student must start over. | C                                                                                                                                       |
| REQ-029 | Recommended timer duration is 10–15 minutes, explicitly marked TBD.                                            | A — default 15 minutes, config-driven (assumption A1).                                                                                  |

## Tracking (§6.3)

| ID      | Statement                                              | Marker                                                                                                                                                            |
| ------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-030 | PENDING → "Your order is being reviewed."              | C                                                                                                                                                                 |
| REQ-031 | VERIFIED → "Congratulations — number confirmed!"       | C                                                                                                                                                                 |
| REQ-032 | REJECTED → "Order rejected — please contact admin."    | C                                                                                                                                                                 |
| REQ-033 | Tracking is performed via email or WhatsApp, no login. | X — see REQ-013; superseded by opaque reference + tracking-token model (ADR-005). Login-free property is preserved; the _lookup key_ is not email/WhatsApp alone. |

## Admin verification (§6.4)

| ID      | Statement                                                     | Marker |
| ------- | ------------------------------------------------------------- | ------ |
| REQ-034 | Admin panel shows a list of PENDING orders.                   | C      |
| REQ-035 | Opening an order shows the uploaded proof image.              | C      |
| REQ-036 | Valid payment → order VERIFIED, number → SOLD.                | C      |
| REQ-037 | Invalid payment → order REJECTED, number → back to AVAILABLE. | C      |

## Number management (§6.5)

| ID      | Statement                                                                           | Marker |
| ------- | ----------------------------------------------------------------------------------- | ------ |
| REQ-038 | Admin can add new numbers (enter or paste), saved as AVAILABLE.                     | C      |
| REQ-039 | Admin can remove a number only if its status is AVAILABLE.                          | C      |
| REQ-040 | Admin can manually update a number's status, e.g. to SOLD_OFFLINE for direct sales. | C      |

## Status lifecycle (§7)

| ID      | Statement                                                                            | Marker                                                                                                                               |
| ------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| REQ-041 | Four named statuses: AVAILABLE, RESERVED, PENDING, SOLD.                             | X — §6.5 introduces a fifth (`SOLD_OFFLINE`) not listed in this table. ADR-003 formalises the five-state model per master prompt §8. |
| REQ-042 | RESERVED → PENDING when order is submitted; RESERVED → AVAILABLE when timer expires. | C (and wins over REQ-027; see above)                                                                                                 |
| REQ-043 | PENDING → SOLD on admin verify; PENDING → AVAILABLE on admin reject.                 | C                                                                                                                                    |
| REQ-044 | SOLD has no automatic transition — admin override only.                              | C                                                                                                                                    |

## Database structure (§8)

| ID      | Statement                                                                                                                      | Marker                                                                                   |
| ------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| REQ-045 | Three collections: `/numbers/{numberId}`, `/orders/{orderId}`, `/config/{configId}`.                                           | C                                                                                        |
| REQ-046 | `numbers` document ID = the phone number itself; unique.                                                                       | C                                                                                        |
| REQ-047 | `numbers.number`: required, unique, 10–13 digits, starts with `08`.                                                            | C                                                                                        |
| REQ-048 | `numbers.status` enum: available \| reserved \| pending \| sold.                                                               | X — extended to include `sold_offline`, see REQ-041.                                     |
| REQ-049 | `numbers` carries `reserved_at`, `reserved_until`, `session_id` (all nullable), `sold_at`, `updated_at`.                       | C                                                                                        |
| REQ-050 | `orders.id` auto-generated; `orders.number` must exist in `numbers`; `orders.session_id` must match the reservation's session. | C                                                                                        |
| REQ-051 | `orders.full_name`: required, 2–100 chars.                                                                                     | C                                                                                        |
| REQ-052 | `orders.university`: required, must be from the allowed list.                                                                  | C                                                                                        |
| REQ-053 | `orders.whatsapp`: required, Indonesian format `08xxxxxxxxxx`.                                                                 | C — display format; storage normalisation is an implementation addition (C5).            |
| REQ-054 | `orders.email`: required, valid email format.                                                                                  | C                                                                                        |
| REQ-055 | `orders.package_id`: required, must exist in `config/packages`.                                                                | C                                                                                        |
| REQ-056 | `orders.payment_proof_url`: required on submit.                                                                                | C                                                                                        |
| REQ-057 | `orders.status` enum: pending \| verified \| rejected, set by admin.                                                           | C                                                                                        |
| REQ-058 | `orders` carries `submitted_at`, `verified_at`, `verified_by`, `admin_note` (all as specified).                                | C                                                                                        |
| REQ-059 | `config/payment`: `qr_image_url`, `payment_label`, `updated_at`.                                                               | C                                                                                        |
| REQ-060 | `config/packages`: `packages[]` of `(id, label, price)`, `updated_at`.                                                         | C — schema extended per C3 (quota fields, roaming, voice, SMS, recommended flag, order). |
| REQ-061 | `config/universities`: `list[]`, `updated_at`.                                                                                 | C                                                                                        |

## Data packages (§9)

| ID      | Statement                                                                                  | Marker                                                                          |
| ------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| REQ-062 | Five packages: `pkg_70gb`, `pkg_120gb`, `pkg_160gb`, `pkg_220gb`, `pkg_300gb`, all Active. | C                                                                               |
| REQ-063 | All five prices are TBD.                                                                   | A — design ships concrete draft prices; seeded with `price_status: draft` (C2). |

## File storage (§10)

| ID      | Statement                                                             | Marker                                                                                                           |
| ------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| REQ-064 | Accepted formats: JPG, PNG, WEBP.                                     | C                                                                                                                |
| REQ-065 | Max file size 5 MB.                                                   | C                                                                                                                |
| REQ-066 | Naming convention `proofs/{orderId}-{timestamp}.{ext}`.               | C                                                                                                                |
| REQ-067 | Storage is private — readable only via signed URL or the admin panel. | C                                                                                                                |
| REQ-068 | Retention: "keep indefinitely (define cleanup policy post-launch)."   | X — master prompt §24 requires PII minimisation; ADR-006 sets a 90-day post-terminal default (C19), overridable. |

## Number dataset (§11)

| ID      | Statement                                                                             | Marker                                                                                  |
| ------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| REQ-069 | 100 raw entries, 4 duplicates, 96-number clean pool.                                  | C — independently verified true in `seed-reconciliation.md` (B006), not merely assumed. |
| REQ-070 | Four named duplicate numbers: 081125174670, 081125177001, 081125177002, 081125177362. | C                                                                                       |

## Open items (§12)

| ID      | Statement                                                                                         | Marker                                                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| REQ-071 | Reservation timer length: 10–15 min, TBD.                                                         | A — 15 min default.                                                                                                           |
| REQ-072 | Admin panel auth: "own login, or access-by-URL only? TBD."                                        | X — master prompt §6 forbids obscure-URL model; ADR-002 mandates Firebase Auth + RBAC.                                        |
| REQ-073 | QR image location: admin-updatable via `config/payment`.                                          | C                                                                                                                             |
| REQ-074 | University dropdown list: "to be provided" by Business.                                           | A — seeded with a small placeholder list, admin-editable (OQ-2).                                                              |
| REQ-075 | Reserved-number behaviour on restart/session loss: scheduled cleanup resets expired reservations. | C — implemented as lazy-expiry-authoritative + janitor hygiene (A.3), which is a stronger guarantee than a cleanup job alone. |
| REQ-076 | Offline sales reporting: morning recap + admin marks SOLD_OFFLINE.                                | C                                                                                                                             |

## Coverage check

Every numbered section of the specification (§1–§12) is represented above. No paragraph was found to be unrepresented on a section-by-section walk. Six requirements carry an **X** marker; each is cross-referenced to its owning ADR or contradiction-audit entry rather than being silently resolved here.
