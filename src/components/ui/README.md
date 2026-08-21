# src/components/ui

Design-system primitives: Button, Input, Card, Chip, Badge, Progress, Modal, Toast, and other foundational UI elements defined in `DESIGN.md`.

## What belongs here

- Reusable, context-free UI components that implement the Premium Crimson Pulse design tokens
- Components that are composed by screen-specific components in `../student/` and `../admin/`

## What does NOT belong here

- Screen-specific composed components (use `../student/` or `../admin/`)
- Business logic or data fetching
- Direct Firestore/Storage access
