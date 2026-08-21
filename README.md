# Telkomsel Halo Number Ordering System

A serverless, login-free web app that lets university students reserve an exclusive Telkomsel Halo phone number, choose a data package, and pay via QRIS — while guaranteeing the same number is never sold twice across the online and offline (campus direct-sales) channels. Includes a two-role admin panel for manual payment verification and inventory management.

## The problem it solves

Telkomsel's campus SIM cards were previously sold through an offline sales team with no shared source of truth, so a number could be sold twice — once in person, once (if an online channel existed) to a different student. This system is the shared source of truth: a number reserved online is locked; a number sold offline is marked unavailable online; nothing falls through the gap.

## Quickstart

Prerequisites: Node.js 20+ (v24.18.1 verified in this environment), pnpm (via `corepack enable`), a JDK for the Firestore/Storage emulators (e.g. `brew install openjdk@21` — the emulators print a clear error naming this if it's missing), the Firebase CLI (installed as a project devDependency, invoked via `pnpm exec firebase` — no global install assumed).

```bash
pnpm install                 # install dependencies
pnpm emulators                # start the Firebase Emulator Suite (Firestore, Storage, Auth)
pnpm seed                     # in a second terminal: reconcile + import the 96-number seed dataset
pnpm dev                      # start the Next.js dev server against the emulators
```

Then open `http://localhost:3000` for the student flow and `http://localhost:3000/admin` for the admin panel (see `docs/adr/002-admin-authentication.md` for how to bootstrap the first admin account locally).

## Script index

| Script                              | Purpose                                                                                |
| ----------------------------------- | -------------------------------------------------------------------------------------- |
| `pnpm dev`                          | Next.js dev server                                                                     |
| `pnpm build`                        | Production build                                                                       |
| `pnpm typecheck`                    | `tsc --noEmit`                                                                         |
| `pnpm lint`                         | ESLint, including this project's custom AGENTS.md-derived rules                        |
| `pnpm format` / `pnpm format:check` | Prettier write / check                                                                 |
| `pnpm emulators`                    | Firebase Emulator Suite (Firestore/Storage/Auth), importing/exporting `.emulator-data` |
| `pnpm test:unit`                    | Vitest, Node environment — `src/domain` + `src/lib`                                    |
| `pnpm test:component`               | Vitest, jsdom environment — `src/components`                                           |
| `pnpm test:integration`             | Vitest, Node environment — `src/server` (requires emulators running)                   |
| `pnpm test:coverage`                | Vitest with v8 coverage                                                                |
| `pnpm test:e2e`                     | Playwright — mobile (390×844) + desktop (1440×900) projects                            |
| `pnpm test:a11y`                    | Playwright's accessibility-tagged tests via axe-core                                   |
| `pnpm seed`                         | Reconcile and import `data/seed/numbers.source.txt` — added in Phase 5                 |

_(This list is updated whenever a script is added, renamed, or removed — AGENTS.md.)_

## Project structure

See `AGENTS.md`'s directory map for the full breakdown of `src/app`, `src/components`, `src/domain`, `src/server`, `src/lib`, `src/schemas`.

## Where to find each document

See `docs/README.md` for the full index. Start with `PRD.md` for what the system does, `ARCHITECTURE.md` for how it's built, and `DESIGN.md` for what it looks like.

## Contribution basics

Conventional Commits, one logical change per commit. Read `AGENTS.md` before making a change — it states the non-negotiable constraints (no client-side Firestore writes, no business logic in components, no hardcoded config values) and when an ADR is required versus a `PROJECT_DECISIONS.md` entry.

## Current status and known limitations

This repository is being built following the phased execution playbook in `planning/`. As of this commit: Phase 0 (discovery), Phase 1 (documentation), and Phase 2 (repository bootstrap — Next.js, tooling, testing infrastructure, the Firebase emulator suite, and shared utilities) are complete. Phase 3 (design system) is next. There is no student- or admin-facing functionality yet — `pnpm dev` currently serves only a placeholder root page. See `docs/reports/phase-0-summary.md` for what's confirmed, assumed, and still open (`docs/reports/open-questions.md`) — notably, the real QRIS payment asset and final package pricing are not yet available (OQ-1, OQ-6) and block production launch specifically, not development.
