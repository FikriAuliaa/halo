# src/schemas

Zod schemas shared between client-side form validation and server-side enforcement.

## What belongs here

- Zod schema definitions for order submission form fields
- Zod schemas for admin input validation
- Shared type exports derived from schemas (`z.infer<typeof ...>`)

## What does NOT belong here

- Business logic (use `@/domain`)
- React components or form UI
- Server-side I/O or Route Handler logic
- Firestore document type definitions (those derive from `DATA_MODEL.md` and live closer to the repository layer)
