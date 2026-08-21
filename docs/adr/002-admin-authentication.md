# ADR-002: Admin Authentication and Authorization

**Status:** Accepted
**Date:** 2026-08-20
**Owning blocks:** B020, Phase 10 (B093–B097)

## Context

Spec §12 item 2 leaves admin auth explicitly "TBD" ("own login, or access-by-URL only?"). Two roles exist per spec §5 (`Admin Kampus`, `Admin Telkomsel`) with slightly different capabilities (offline-sales visibility/marking is Telkomsel-specific). Students must remain login-free (REQ-NG-001) — this decision only concerns the admin side.

## Decision

Firebase Authentication, email/password, admin accounts only. Two custom claims, `role: 'ADMIN_KAMPUS' | 'ADMIN_TELKOMSEL'`, set exclusively via a server-side Admin SDK script — no self-registration path exists anywhere in the product. Every admin Route Handler independently verifies the ID token and the required role claim; the client-side route guard (redirect to `/admin/login` for an unauthenticated visitor) exists only for UX, never as the actual control.

**Bootstrap:** a one-off script (`scripts/bootstrap-admin.ts`, run manually by the project owner per environment) creates the first `ADMIN_TELKOMSEL` account and sets its claim directly via the Admin SDK. All subsequent admin accounts are created the same way, or via an in-app "invite/create admin" action gated to `ADMIN_TELKOMSEL` (added in Phase 10 if the business wants it — v1 minimum is the bootstrap script alone).

**Session lifetime:** standard Firebase ID token expiry (1 hour) with silent refresh via the client SDK's built-in mechanism; no custom session extension.

**Logout:** clears the Firebase Auth session client-side and is not itself a trusted-tier operation (nothing server-side needs to change on logout, since every request is independently authorized).

**Unauthorized access:** any admin route or Route Handler hit without a valid token/role returns `401`/`403` per `API_SPEC.md`'s error envelope; the client redirects to login without rendering any protected content first.

**Auditability:** every admin mutation records the acting admin's UID (`verified_by`, and equivalent fields on other admin operations), per ADR-010.

## Alternatives considered

- **Access-by-obscure-URL, no login.** This was the spec's own tentative fallback, not a firm decision (marked TBD). Rejected outright — an obscure URL is not an access control, it's an access control's absence with extra steps; anyone who learns the URL (a screenshot, a referrer header, a shared link) has full admin access permanently.
- **A single shared admin password.** Rejected — no per-admin audit trail (`verified_by` would be meaningless), no ability to revoke one compromised credential without breaking access for everyone (see `RUNBOOK.md` procedure 7, which depends on being able to disable exactly one account).
- **A fine-grained permission matrix beyond two roles.** Rejected as premature — spec §5 describes exactly one capability difference between the two roles (offline-sales handling); a matrix would be unused complexity for a two-role, small-admin-team system.

## Consequences

Adding a third admin role later is a config/claims change, not a schema migration. Losing access to the Firebase project's Auth console would mean losing the ability to create new admins without redeploying the bootstrap script — an accepted operational dependency, documented in `DEPLOYMENT.md`.

## Verification

E2E scenario K (unauthorized access denied) and scenario L (`ADMIN_KAMPUS` attempting a Telkomsel-only action gets `FORBIDDEN`); integration tests hitting every admin Route Handler with no/invalid/wrong-role tokens.
