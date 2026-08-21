# RUNBOOK.md

Each procedure: detection → immediate action → resolution → follow-up.

## 1. Stuck reservation (student reports "my number won't let me continue")

**Detection:** Student report, or admin sees a `numbers` document `reserved` with `reserved_until` in the past that the janitor hasn't yet cleaned up.
**Immediate action:** Confirm via the lazy-expiry predicate that the reservation is in fact expired — if so, this is cosmetic (the number is already logically available to a new attempt) and the student simply needs to retry the number-selection page.
**Resolution:** If truly stuck (not expired, but the student's session cookie was lost — e.g. browser data cleared), no automated recovery exists by design (the session is intentionally not recoverable without the cookie); the student starts over.
**Follow-up:** None required unless this is reported unusually often, which would indicate a session-cookie bug worth investigating.

## 2. Failed cleanup job

**Detection:** Alert on janitor last-run age (query `cron.job_run_details` for the `cleanup-expired-reservations` job, or watch structured `cleanup_run` events).
**Immediate action:** Check `cron.job_run_details` for the failure cause. Correctness is unaffected (ADR-004) — this is not an emergency. If an immediate tidy-up is wanted while investigating, use `adminRunCleanup` (`POST /api/admin/cleanup/run`, `ADMIN_TELKOMSEL`) — it calls the identical `cleanup_expired_reservations()` function pg_cron does.
**Resolution:** Fix the underlying issue (a `pg_cron` misconfiguration, a Postgres extension not enabled after a project reset); confirm the next scheduled run succeeds, or keep calling `adminRunCleanup` manually until it does.
**Follow-up:** If the failure recurs, investigate root cause (permissions, extension availability, a migration regression).

## 2a. Force-releasing a stuck live reservation

**Detection:** A student is genuinely blocked by another party's still-live reservation and support has confirmed (via `adminListNumbers`) that it's not simply expired-but-uncleaned.
**Immediate action:** `adminForceReleaseReservation` (`POST /api/admin/numbers/{id}/force-release`, `ADMIN_TELKOMSEL` only) — requires a written `reason`, fully audited (`audit_log`). This is genuinely destructive to whoever currently holds the reservation, mid-order; use it only after confirming the reservation is not a legitimate in-progress purchase.
**Resolution:** Confirm the number is `available` afterward and the original holder's session no longer references it.
**Follow-up:** Note the reason and outcome; if this becomes routine for one specific number, investigate why (a bot repeatedly grabbing it, a UI bug preventing normal release).

## 3. Wrongly-verified order

**Detection:** Admin or student reports an order marked VERIFIED that shouldn't have been (e.g. payment proof was actually invalid).
**Immediate action:** There is no automated "un-verify." An admin manually corrects the order's `status` and the number's `status` via direct, audited admin tooling access (not the standard verify/reject operations, which don't support reversal by design — see `API_SPEC.md`).
**Resolution:** Contact the student regarding the correction; document the reason in `admin_note`.
**Follow-up:** Record the incident; if it recurs, review the verification UI for a contributing usability issue.

## 4. Unreadable proof image

**Detection:** Admin reports the signed URL 404s or the image won't render.
**Immediate action:** Confirm the object exists in Storage at the recorded `payment_proof_path`; check whether it fell outside the 90-day retention window (ADR-006).
**Resolution:** If retention-expired, there is no recovery — this is the accepted tradeoff of the retention policy; the order's other fields remain intact for record-keeping. If not retention-expired, investigate a signed-URL-minting bug.
**Follow-up:** None if retention-expired and expected.

## 5. Lost tracking token

**Detection:** Student reports they can't find their `order_ref`/token.
**Immediate action:** Honest limitation: the plaintext token is never recoverable server-side (only its hash is stored, by design — `SECURITY.md`).
**Resolution (admin-mediated fallback):** An admin, after independently confirming the requester's identity via the order's stored name/email/WhatsApp through a side channel, can look up and manually relay the order's current status. The admin cannot regenerate a usable tracking token for the student's self-service use — this fallback is status-relay only, not restoration of self-service tracking.
**Follow-up:** None; this is accepted behaviour, not a bug.

## 6. Unreachable Postgres/Supabase

**Detection:** `GET /api/health/ready` reports `database` (or `storage`) unhealthy; Route Handler error rate spike.
**Immediate action:** Check the Supabase project status/quota (or the local stack's Docker containers in dev). `/api/health` (liveness) stays green through this — only readiness reflects it, so the process itself isn't restarted over a transient blip. The app fails closed (errors, not silent incorrect success) on any Postgres/Storage unavailability.
**Resolution:** Wait for platform recovery, or escalate to Supabase support if project-specific.
**Follow-up:** Post-incident review if downtime exceeded the alerting threshold.

## 7. Compromised admin account

**Detection:** Unexpected admin actions in the audit log, or a report of credential compromise.
**Immediate action:** Disable the Firebase Auth user immediately (Admin SDK `updateUser({disabled: true})` or console action); this revokes access without deleting the audit trail.
**Resolution:** Review the audit log for actions taken under that account during the suspected compromise window; reverse any incorrect verify/reject actions per procedure 3. Issue a new account after credentials are secured.
**Follow-up:** Rotate any shared secrets the account might have had access to; review whether MFA should be mandated.

## 8. QRIS image update

**Detection:** Business provides a new QRIS asset.
**Immediate action:** Admin uploads the new image via `adminUpdatePaymentConfig`.
**Resolution:** Confirm the payment screen renders the new image; the old image is not automatically deleted (kept for audit trail of what was shown during which period).
**Follow-up:** None.

## 9. Emergency inventory freeze

**Detection:** A serious issue requires halting all new reservations (e.g. a suspected double-sell bug).
**Immediate action:** Set `config/system.reservation_ttl_minutes` reasoning aside — the actual freeze mechanism is a dedicated `config/system.reservations_paused: boolean` flag (add if not already present) checked by `reserveNumber` before its transaction; flip it to `true`.
**Resolution:** Investigate and fix the underlying issue with reservations paused; existing PENDING orders are unaffected and can still be verified/rejected.
**Follow-up:** Flip the flag back once resolved; document the incident.

## 10. Bulk offline-sales import

**Detection:** Routine (see Operations §"Offline-sales recap procedure").
**Immediate action:** Use the bulk `adminMarkSoldOffline` tool.
**Resolution:** Review any per-number conflicts the operation reports (numbers currently reserved) individually.
**Follow-up:** None for the routine case.
