# src/domain

Pure business logic: status transitions, reservation rules, price/expiry calculations, and validation predicates.

## What belongs here

- Pure functions implementing business rules (no I/O, no side effects)
- Status lifecycle definitions and transition guards
- Price calculations, expiry checks, phone number normalisation
- Anything that both components and server operations need to agree on

## What does NOT belong here

- Any I/O: no Firestore reads/writes, no HTTP calls, no file system access
- React components or hooks
- Route Handler logic (use `@/server`)
- Framework-specific code
