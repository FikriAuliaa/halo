# PRD — Telkomsel Halo Number Ordering System

## Executive summary

A serverless, login-free web application that lets university students reserve one of a fixed pool of exclusive Telkomsel Halo numbers, choose a data package, submit basic identity information, pay via a single static QRIS, and upload payment proof for manual admin verification — while guaranteeing that no number is ever sold through this channel that has already been reserved, sold, or sold offline through the campus direct-sales channel. An admin panel supports two roles (`ADMIN_KAMPUS`, `ADMIN_TELKOMSEL`) for payment verification and inventory management.

## Background

Telkomsel distributes exclusive SIM cards to university students through two disconnected channels: an offline field sales team and (previously) no online channel at all. With no shared source of truth for which numbers are taken, the same number can be sold twice — once by a salesperson, once by a student ordering online — and neither admins nor students have any visibility into real-time stock or order status.

## Problem statement

Uncoordinated online and offline sales channels for the same finite number pool create a double-selling risk with no operational visibility. (REQ-001)

## Goals

1. Zero double-sold numbers, across both channels, under concurrent load. (REQ-001, REQ-003)
2. A student can go from browsing to a submitted, trackable order without creating an account. (REQ-002, REQ-NG-001)
3. An admin can verify or reject a payment and manage inventory — including numbers sold offline — from one panel. (REQ-006, REQ-014, REQ-016, REQ-017)
4. The system stays operable by a small, non-technical admin team: manual verification, no payment-gateway integration, no automation the team can't reason about. (REQ-NG-002, REQ-NG-003)

## Non-goals

Student accounts/login (REQ-NG-001) · automated/webhook payment verification (REQ-NG-002) · real-time sync with Telkomsel internal systems (REQ-NG-003) · a mobile app (REQ-NG-004) · multiple payment methods (REQ-NG-005) · automated SMS/email notifications (REQ-NG-006, and see the confirmation-screen copy correction below).

## Users

- **Student** — a prospective SIM card buyer, unauthenticated, using a phone browser. Wants: find a memorable number, understand what they're paying for, pay once, know their order isn't lost.
- **Admin Kampus** — campus-side staff verifying payments and managing inventory day to day.
- **Admin Telkomsel** — Telkomsel-side staff with everything Admin Kampus has, plus visibility into offline-channel sales for reconciliation.

## User journeys

**Student — happy path.** Open the site → see a sampled page of available numbers → tap one, which is immediately reserved for 15 minutes and starts a visible countdown → choose a package → fill in name/university/WhatsApp/email → see the QRIS code, the order total, and an order reference/tracking code shown once → upload a payment screenshot → submit → land on a confirmation screen showing the order reference and tracking token, told to save them, with self-service tracking instructions. Later, the student can revisit a tracking page, enter their reference + token, and see PENDING → VERIFIED/REJECTED.

**Admin Kampus — verifying a payment.** Log in → see a queue of PENDING orders → open one → view the customer's data and the uploaded proof image (via a signed URL, never a public link) → compare the amount against the package price → approve (order → VERIFIED, number → SOLD) or reject with a note (order → REJECTED, number → AVAILABLE).

**Admin Telkomsel — offline reconciliation.** Log in → see the same views as Admin Kampus, plus the ability to mark a number `SOLD_OFFLINE` directly (single or bulk), removing it from the online pool without an order ever existing for it.

## Functional requirements

Every functional requirement below traces to `docs/reports/requirements.md`. This section restates them as testable statements; the register is the source of truth for exact wording and marker (confirmed/assumed/contradicted).

- The number list endpoint returns only currently-available numbers, sampled, refreshable. (REQ-007, REQ-018, REQ-019, C14)
- Selecting a number atomically reserves it for exactly one session for `config/system.reservation_ttl_minutes` (default 15 — Assumption A1), or fails with `NUMBER_UNAVAILABLE` if it's no longer available. (REQ-003, REQ-008, REQ-020, REQ-025, REQ-029)
- An expired reservation is treated as available by every reader, independent of whether a cleanup job has run. (REQ-028, REQ-075 — see ADR-004)
- Package selection offers exactly the five configured tiers; price, quota, roaming, voice, and SMS figures are config-driven, not hardcoded. (REQ-009, REQ-021, REQ-062, REQ-063)
- The order form validates name (2–100 chars), university (must be in `config/universities`), WhatsApp (normalised to E.164, displayed as `08...`), and email — client-side for UX, server-side for enforcement. (REQ-010, REQ-022, REQ-051–054)
- Submitting an order transitions the number RESERVED → PENDING (not "stays RESERVED" — see ADR-003's resolution of the spec's internal contradiction) and requires an uploaded, validated payment proof. (REQ-024, REQ-026, REQ-042, REQ-056, REQ-064–066)
- A submitted order is assigned an opaque `order_ref` and a tracking token, both minted at reservation time (not submission), shown to the student on the payment screen and again on the confirmation screen. (REQ-013/033 as superseded by ADR-005)
- Students can look up an order's status using `order_ref` + tracking token, with no login. (REQ-030–032, ADR-005)
- Admins can list, filter, and open PENDING orders; view proof via a time-limited signed URL; and verify (→ VERIFIED, number → SOLD) or reject (→ REJECTED, number → AVAILABLE) with an optional note. (REQ-034–037, REQ-043)
- Admins can add numbers (single/bulk), remove a number only while AVAILABLE, and mark a number SOLD_OFFLINE. (REQ-038–040)
- SOLD has no automatic transition — only an explicit admin action changes it further. (REQ-044)

## Business rules

- **One-owner invariant:** at any instant, at most one non-expired reservation or non-rejected order may reference a given number. This is the system's core correctness property (see `TEST_PLAN.md`'s concurrency suite).
- **Status lifecycle** (ADR-003): `available → reserved → pending → sold`, with `reserved → available` on expiry, `pending → available` on rejection, and a direct `available → sold_offline` path outside the online flow entirely. `sold` and `sold_offline` are terminal except for explicit admin override.
- **Reservation timer is server-authoritative.** The UI countdown is a presentation layer only; correctness never depends on the client's clock or on the client staying on the page.
- **Package prices are draft until confirmed** (`price_status`), per Assumption A3 / OQ-1 — students in non-production environments see a visible "harga sementara" indicator.

## Status lifecycle (authoritative)

```
AVAILABLE --(student reserves)--> RESERVED --(order submitted)--> PENDING --(admin verifies)--> SOLD
RESERVED --(timer expires)--> AVAILABLE
PENDING --(admin rejects)--> AVAILABLE
AVAILABLE --(admin marks offline sale)--> SOLD_OFFLINE
```

## Acceptance criteria (given/when/then, representative sample — full set in `TEST_PLAN.md`)

- **Given** an available number, **when** two students attempt to reserve it within the same second, **then** exactly one reservation succeeds and the other receives `NUMBER_UNAVAILABLE`.
- **Given** an active reservation, **when** its TTL elapses without a submitted order, **then** the number is available to a new reservation attempt immediately, without waiting for the scheduled cleanup to run.
- **Given** a submitted order awaiting verification, **when** the reservation's original TTL would have elapsed, **then** the number remains PENDING, not released — because it is no longer in the RESERVED state at all.
- **Given** a rejected order, **when** the admin rejects it, **then** the number returns to AVAILABLE and can be reserved again by any student, including the same one.
- **Given** a valid `order_ref` but an incorrect tracking token, **when** a tracking lookup is attempted, **then** the system returns a generic not-found response, not a hint about which part was wrong.

## Edge cases

Browser refresh mid-reservation (must not lose the reservation if still valid — session cookie persists); duplicate submit-button clicks (idempotency key, see `API_SPEC.md`); upload of a non-image or oversized file (rejected client-side for UX, rejected server-side authoritatively via magic-byte check, not extension); admin rejecting an order that was already verified by another admin session (last-write concern, resolved via a Firestore transaction on the order document); a number reserved, then marked SOLD_OFFLINE by an admin before the reservation expires (admin action must fail or force-release the conflicting reservation — resolved in ADR-004/ADR-007 in favour of blocking the admin action with a clear "currently reserved" message, since silently overriding a live student session is worse than asking the admin to wait).

## Error handling

Every error surfaced to a student uses the centrally-enumerated codes from `API_SPEC.md` with a safe, translated message — never a raw Firestore/Storage error. Every error surfaced to an admin may include more operational detail (still never a stack trace) since admins are authenticated and trusted with more context.

## Observability

Structured server logs with correlation IDs on every request; a defined event list (number reserved, reservation expired, order submitted, proof uploaded, order verified/rejected) per ADR-010; no raw payment-proof content or full PII in logs — see `SECURITY.md`'s redaction rules.

## Security considerations

Full model in `SECURITY.md`. Headline commitments: no obscure-URL admin access (RBAC via Firebase Auth custom claims); private proof storage with signed-URL access only; tracking via an unguessable token whose hash — not the plaintext — is stored; all mutations server-mediated.

## Success metrics

**Zero double-sold numbers** is the headline metric — any occurrence is a P0 incident (`RUNBOOK.md`). Secondary: reservation-to-submission completion rate, admin verification turnaround time, upload failure rate.

## Risks

A missed janitor run degrading admin dashboard accuracy without breaking correctness (accepted, by design — see ADR-004); the real QRIS asset and final prices not being available before launch (OQ-1, OQ-6 — both are launch-blocking, not build-blocking); volume assumptions (A6) proving wrong for a viral launch moment (mitigated by Firestore's own scaling, not by anything bespoke).

## Assumptions

A1 (15-minute TTL) · A2 (Firebase App Hosting) · A3 (draft prices) · A4 (Extra Benefit out of scope) · A5 (one reservation per session) · A6 (campus-scale volume) · A7 (one static QRIS for all amounts) — full detail and reversal cost in `planning/00_EXECUTION_PLAN.md` Part B.3 and `docs/reports/phase-0-summary.md`.

## Open questions

Full register: `docs/reports/open-questions.md`. Only OQ-4 (admin bootstrap) and OQ-6 (real QRIS asset) block a milestone before production, and neither blocks development work.

## Scope boundaries

In scope: everything under "Functional requirements" above, for both the student flow and the two-role admin panel, across dev/staging/prod. Out of scope: everything in "Non-goals," plus the "Extra Benefit" feature (OQ-3) and automated offline-sales file import (OQ-7) for v1.
