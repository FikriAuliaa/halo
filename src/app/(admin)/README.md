# `src/app/(admin)`

Route group for the admin panel: dashboard, order queue/detail, number management, package/university/payment configuration (Phase 10–13). Every page here renders behind a server-side role check (`ADMIN_KAMPUS` / `ADMIN_TELKOMSEL`) performed in the corresponding Route Handler or a shared server-side auth guard — the client-side redirect in this route group is UX only, per `docs/adr/002-admin-authentication.md`.

**Must not go here:** any page that skips the server-side role check; any direct Firestore/Storage access.
