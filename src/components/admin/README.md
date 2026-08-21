# src/components/admin

Screen-specific composed components for the admin panel (dashboard, order management, number inventory, package/university/payment configuration).

## What belongs here

- Components that compose UI primitives from `../ui/` for admin-facing screens
- Admin-specific layout and data presentation

## What does NOT belong here

- Design-system primitives (use `../ui/`)
- Business logic or domain rules (use `@/domain`)
- Direct Firestore/Storage access or any mutation logic (use `@/server` via Route Handlers)
- Student-specific components (use `../student/`)
