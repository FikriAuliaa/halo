# src/components/student

Screen-specific composed components for the student ordering flow (number selection, package selection, personal data form, payment, confirmation, tracking).

## What belongs here

- Components that compose UI primitives from `../ui/` for specific student-facing screens
- Client-side form state and validation (calling shared Zod schemas from `@/schemas`)

## What does NOT belong here

- Design-system primitives (use `../ui/`)
- Business logic or domain rules (use `@/domain`)
- Direct Firestore/Storage access or any mutation logic (use `@/server` via Route Handlers)
- Admin-specific components (use `../admin/`)
