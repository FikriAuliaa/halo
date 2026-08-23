# Monitoring (B127)

## Structured logging

Every request-scoped log line goes through `src/server/framework/logger.ts`: JSON, one `correlation_id` per request (generated at the Route Handler boundary, returned to the client in `x-correlation-id` and in every `AppError` response body), and centralized redaction (`full_name`, `whatsapp`, `email`, `tracking_token`, `admin_note`, `payment_proof_path` are replaced with `[REDACTED]` wherever they appear, at any nesting depth — never per-call-site, so a new event type can't forget to redact an already-known-sensitive field).

Verified live (Phase 14): submitted a real order with a distinctive name/email/phone and grepped the actual server log output for all three values — zero matches. A real reservation's tracking token — zero matches anywhere in server output, including the `reservation_created` event that logs the same reservation.

Every trusted-tier mutation also writes to the `audit_log` table (actor UID, actor role, action, before/after snapshot, reason where applicable) inside the same transaction as the mutation itself — a permanent record distinct from operational logs, which rotate out of retention.

## Observability events (`src/server/observability/events.ts`)

| Event                    | Fields                                                      | Fired from                                                           |
| ------------------------ | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| `reservation_created`    | `number`, `order_ref`, `session_id_hash`                    | `POST /api/numbers/{id}/reserve` on success                          |
| `reservation_failed`     | `number`, `session_id_hash`, `reason` (the `AppError` code) | same route, on any `AppError`                                        |
| `reservation_expired`    | `number`                                                    | lazy-expiry observation points                                       |
| `reservation_released`   | `number`, `session_id_hash`, `forced_by_admin`              | voluntary release and `adminForceReleaseReservation`                 |
| `reservation_taken_over` | `number`                                                    | A5 takeover path                                                     |
| `cleanup_run`            | outcome counts                                              | `adminRunCleanup` and the scheduled `cleanup_expired_reservations()` |

`session_id` is always hashed before logging — the raw value is a bearer credential for that browser's reservation state.

## Proposed log-based metrics and alerts

This environment has no real cloud logging/alerting backend to wire these into (no GCP/Datadog/etc. project exists here) — the queries and thresholds below are the actual specification to configure wherever this deploys, not a claim that they're live today. Each names the `RUNBOOK.md` procedure that resolves it, per B127's own constraint that an alert nobody can act on trains people to ignore all alerts.

| Metric                              | Query shape                                                                                                                                                              | Alert threshold                                                                             | Runbook                                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Reservation success rate            | `count(reservation_created) / (count(reservation_created) + count(reservation_failed))` over 5 min                                                                       | Sustained < 80% (excluding `NUMBER_UNAVAILABLE`, which is expected contention, not a fault) | Investigate via `event: reservation_failed` grouped by `reason`                                              |
| Reservation failure spike by reason | `count(reservation_failed)` grouped by `reason`, 5 min                                                                                                                   | Any single non-`NUMBER_UNAVAILABLE` reason > 10 in 5 min                                    | Depends on `reason` — `RATE_LIMITED` spikes point at §on abuse review; `INTERNAL` points at DB/config health |
| Cleanup job staleness               | `now() - max(cron.job_run_details.end_time)` for `cleanup-expired-reservations` (already computed live by `adminGetDashboardMetrics`/`getDiagnostics`)                   | > 15 minutes                                                                                | RUNBOOK.md §2 "Failed cleanup job"                                                                           |
| Order submission rate               | `count` of `POST /api/orders` 2xx responses, 5 min                                                                                                                       | Informational (campus-scale traffic, no hard threshold)                                     | —                                                                                                            |
| Verification latency                | `orders.verified_at - orders.submitted_at`, p50/p95                                                                                                                      | p95 > 24h                                                                                   | Points at admin staffing, not a code fault                                                                   |
| Pending orders aging                | `count(*) from orders where status = 'pending' and submitted_at < now() - interval '24 hours'` (already computed by `adminGetDashboardMetrics`'s `stale_pending_orders`) | > 0, sustained                                                                              | Admin queue is falling behind — operational, not a code alert                                                |
| Error rate by code                  | `count` of `app_error`/`unhandled_exception` log events grouped by `code`                                                                                                | Any `INTERNAL`/`unhandled_exception` > baseline                                             | Check `/api/health/ready` first, then the correlation ID's full log line                                     |
| Rate-limit rejection spike          | `count` of `RATE_LIMITED` responses, grouped by operation, 5 min                                                                                                         | Sustained spike on `reserveNumber`/`submitOrder` from one IP hash                           | Possible abuse — see `SECURITY.md`'s rate-limiting table                                                     |
| Upload failure rate                 | `count` of `FILE_TOO_LARGE`/`INVALID_FILE_TYPE` on `POST /api/orders`, 5 min                                                                                             | Sustained spike                                                                             | Could indicate a client-side regression in the upload UI, or a scripted attack                               |

No metric label above carries PII — every one is a count, a duration, a status code, or a hashed identifier, matching the same redaction discipline as the logs themselves.

## Health and diagnostics (B128)

- `GET /api/health` — liveness only, no dependency checks, always 200 while the process is up.
- `GET /api/health/ready` — Postgres reachable, every required `config` row present, both Storage buckets present. 200 when all healthy, 503 otherwise. Reports component names and short safe reasons only — never a raw driver error, host, or version string.
- `/admin/diagnostics` — the same readiness data plus the cleanup job's last-run status, admin-authenticated only.

## Deferred

- Actually wiring the metrics above into a real alerting backend (B127's literal ask: "Trigger each alert condition in staging and confirm it fires") requires a deployed environment with real log aggregation — not achievable in this local-only environment. This document is the specification a real deployment would configure against, not a report of alerts observed firing.
