# OPERATIONS.md

## Daily admin routine

1. Open the admin dashboard, review the PENDING queue count.
2. For each PENDING order: open it, view the proof image, compare the shown amount against `price_at_order`, verify or reject with a note.
3. Review any numbers flagged by the janitor as recently auto-released (visible in the dashboard's "recently expired" list) — no action needed, informational only.
4. If Telkomsel has sent a direct-sales recap for the day (OQ-7), mark the corresponding numbers `SOLD_OFFLINE` via the bulk-paste tool in the number management screen.

## Offline-sales recap procedure

Telkomsel field sales reports sold numbers to Admin Telkomsel, out of band (OQ-7 default: manual, not a file import). Admin Telkomsel pastes the reported numbers into the bulk `adminMarkSoldOffline` tool. Any number already `reserved` at that moment is rejected by the operation (not silently overridden — `SECURITY.md`/`PRD.md` edge case) and surfaced as a conflict the admin must follow up on manually (likely: the offline sale and the online reservation are racing for the same number and a human needs to resolve which one is real).

## Monitoring signals

Structured logs (ADR-010) feed standard alerting on: error rate on any Route Handler exceeding baseline, the scheduled janitor's last successful run age (alert if > 15 minutes, since that's the reservation TTL itself — a longer gap means the admin dashboard's counts could visibly lag), and Firestore/Storage quota utilisation.

## Alert thresholds

Janitor last-run age > 15 min → warning (correctness unaffected, dashboard staleness only, per ADR-004). Route Handler 5xx rate > 1% over 5 min → page. Any single order stuck PENDING > 48 hours → daily digest to admins (operational nudge, not an automated action).

## Health checks

`GET /api/health` (unauthenticated, minimal) confirms Firestore connectivity; used by uptime monitoring, never exposes internal detail.

## Capacity notes

Campus-scale (Assumption A6) — no dedicated capacity planning beyond Firestore/Storage's own automatic scaling. Revisit if a single launch event is expected to draw more than a few hundred concurrent students.

## Backup / export expectations

Firestore's built-in scheduled export (to a Storage bucket in the same project) runs nightly in staging and prod, retained 30 days, per ADR-006/010's minimisation posture — long enough for operational recovery, not an indefinite archive.
