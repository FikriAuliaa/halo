# ADR-010: Observability and Audit

**Status:** Accepted
**Date:** 2026-08-20
**Owning blocks:** B023, cross-cutting through Phase 6–14

## Context

Master prompt §28 asks for lightweight, operationally-useful observability without invasive analytics or excess PII collection. `SECURITY.md`'s PII inventory identifies several fields (full name, WhatsApp, email, tracking token, proof images) that must never appear verbatim in logs.

## Decision

**Structured log schema** (JSON), every entry carrying: `timestamp`, `correlation_id` (generated per incoming request, propagated through any Admin SDK calls it triggers), `level`, `event`, `actor` (`student-session:<hashed session id>` or `admin:<uid>` or `system`), and an `event`-specific payload.

**Event list:** `number_list_viewed`, `number_reserved`, `reservation_expired`, `reservation_released`, `package_selected` (client-side telemetry only, not server-logged — see below), `order_form_completed`, `proof_upload_attempted`, `proof_upload_failed`, `order_submitted`, `order_verified`, `order_rejected`, `number_marked_sold_offline`, `admin_login`, `rate_limit_triggered`.

**Redaction rules:** `full_name`, `whatsapp`, `email` are never logged verbatim — a truncated/hashed correlation value is logged instead when correlating a specific student's actions is needed for debugging. `tracking_token` (plaintext) is never logged under any circumstance, including error logs — only its presence/absence and its hash may appear. Payment proof bytes, signed URLs, and Storage paths are never logged verbatim (a signed URL is itself a bearer credential for the 5-minute window it's valid).

**Audit fields**, distinct from operational logs (these live in Firestore, not just logs, since they're part of the permanent record): `orders.verified_by`/`verified_at`, `numbers.sold_channel`/`sold_at`, every admin mutation's acting UID recorded on the mutated document itself, not only in a log line that might rotate out of retention.

**Client-side analytics** (e.g. `package_selected`, funnel-step views): collected only as anonymous, session-scoped counts for product-funnel visibility — never joined to a specific student's PII, and never sent to a third-party analytics platform (master prompt §28's "avoid invasive analytics, avoid third-party data collection beyond what's needed").

## Alternatives considered

- **Log full request/response bodies for debugging convenience.** Rejected — this is the most direct way to accidentally log PII and proof data verbatim; structured, field-level logging with explicit redaction is more work up front and categorically safer.
- **A dedicated third-party analytics/observability SaaS from day one.** Rejected as unnecessary for campus-scale volume (Assumption A6) — Firebase's own logging plus the structured schema above is sufficient; nothing here forecloses adding one later if volume genuinely grows past what manual log review supports.
- **No client-side funnel analytics at all.** Considered, but rejected — without any funnel visibility, diagnosing "students are dropping off at the package screen" becomes guesswork; anonymous, non-PII-linked counts are a reasonable minimum.

## Consequences

Every new event type added later must be added to this ADR's event list and given an explicit redaction classification before it ships — not an afterthought. A log-schema unit test enforces that the redacted-field list here matches what the logging utility actually redacts.

## Verification

Unit test asserting the logging utility redacts each field named above when present in a log call's payload. Manual review checklist item in the Phase 17 final QA gate: sample real (staging) logs and confirm no PII appears verbatim.
