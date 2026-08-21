# src/server

Trusted-tier implementation: repositories, the server operations from `API_SPEC.md`, and auth checks. This code runs exclusively on the server (Node.js runtime) and is the only code allowed to mutate Firestore or Storage.

## What belongs here

- Repository modules that read/write Firestore collections
- Server operation functions implementing each Route Handler's business logic
- Auth middleware and role verification
- Storage operations (upload, signed URL minting)

## What does NOT belong here

- React components or client-side code
- Pure business logic without I/O (use `@/domain`)
- Route Handler definitions themselves (those live in `@/app/api/`)
- Direct use of the Firebase client SDK — only `firebase-admin` is used here
