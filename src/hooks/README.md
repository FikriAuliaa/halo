# src/hooks

Shared React hooks with no visual output of their own — countdown/timer logic (`use-countdown`), toast state (`use-toast`). Pure UI-state concerns; anything that fetches from or writes to the trusted tier belongs in the component that owns that request, not here.

## What belongs here

- Stateful UI logic reused across more than one component
- Wall-clock-anchored timers (never `setInterval` accumulation — see `use-countdown.ts`)

## What does NOT belong here

- Business logic or domain rules (use `@/domain`)
- Data fetching / mutation calls (call `@/server` operations via `fetch` from the component itself)
