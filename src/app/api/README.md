# `src/app/api`

Route Handlers — the trusted server tier. This is the only part of the codebase permitted to call `firebase-admin` for a write, per `AGENTS.md`'s central rule. Every handler here implements exactly one operation from `API_SPEC.md`, using the shared validation (`src/schemas`), domain logic (`src/domain`), and repository/operation implementations (`src/server`) — a handler itself should stay thin: parse the request, call into `src/server`, map the result to the standard error envelope.

**Must not go here:** business logic (belongs in `src/domain`), or a handler that doesn't correspond to an entry in `API_SPEC.md` — add it there first.
