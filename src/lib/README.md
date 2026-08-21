# src/lib

Cross-cutting utilities: environment validation, error types, ID/token generation, formatting, and time helpers.

## What belongs here

- Environment variable validation (`env.ts`)
- Typed error classes and the `Result` type (`errors.ts`, `result.ts`)
- CSPRNG-backed ID and token generation (`id.ts`)
- Formatting utilities: phone display, currency, dates (`format.ts`)
- Server-time helpers (`time.ts`)
- Supabase service-role client initialisation (`supabase-admin.ts`)

## What does NOT belong here

- Business logic or domain rules (use `@/domain`)
- React components or hooks
- Route Handler logic (use `@/server`)
- Zod schemas (use `@/schemas`)
