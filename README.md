# Telkomsel Halo Number Ordering System

A serverless, login-free web application that lets university students reserve an exclusive Telkomsel Halo phone number, choose a data package, submit order information, and pay via QRIS — while guaranteeing the same number is never sold twice across online and offline (campus direct-sales) channels. Includes a two-role admin panel (`ADMIN_TELKOMSEL` & `ADMIN_KAMPUS`) for payment verification and inventory management.

## Features & Architecture

- **Framework**: Next.js 15 (App Router, TypeScript strict mode)
- **Styling**: Tailwind CSS v3.4 + Premium Crimson Pulse design tokens
- **Database & Auth**: Supabase Postgres (with Row Level Security) & Supabase Auth
- **Storage**: Private Supabase Storage bucket for payment proofs with server-side Sharp image re-encoding
- **Reservation Engine**: CSPRNG-backed atomic reservation with server-side time tracking and lazy expiry enforcement
- **Admin Panel**: Role-gated dashboard (`/admin`) for order management, status updates, number inventory, and configuration management

## Quickstart

### Prerequisites

- Node.js 20+
- pnpm (`corepack enable`)
- Supabase Cloud or Local Supabase (`pnpm dlx supabase start`)

### 1. Environment Setup

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
DATABASE_URL=postgres://postgres:[PASSWORD]@[HOST]:5432/postgres
SUPABASE_URL=https://[YOUR_PROJECT].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SESSION_COOKIE_SECRET=at_least_32_characters_random_secret
```

### 2. Database Seeding & Admin Setup

```bash
# Seed initial configuration (packages, universities, system settings)
env $(cat .env | xargs) pnpm seed:config

# Seed 96 phone numbers dataset
env $(cat .env | xargs) pnpm seed

# Bootstrap initial admin account
env $(cat .env | xargs) pnpm bootstrap-admin --email=admin@telkomsel.co.id
```

### 3. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) for the student ordering flow, or [http://localhost:3000/admin/login](http://localhost:3000/admin/login) for the admin portal.

## Available Scripts

| Script                 | Description                                                         |
| ---------------------- | ------------------------------------------------------------------- |
| `pnpm dev`             | Start Next.js development server                                    |
| `pnpm build`           | Build production application                                        |
| `pnpm typecheck`       | Run TypeScript type checking (`tsc --noEmit`)                       |
| `pnpm lint`            | Run ESLint                                                          |
| `pnpm test`            | Run Vitest unit & integration test suites                           |
| `pnpm test:e2e`        | Run Playwright end-to-end tests                                     |
| `pnpm seed:config`     | Seed system configuration to Postgres                               |
| `pnpm seed`            | Import phone number dataset                                         |
| `pnpm bootstrap-admin` | Create new admin user in Supabase Auth                              |
| `pnpm set-admin-role`  | Change role for existing admin (`ADMIN_TELKOMSEL` / `ADMIN_KAMPUS`) |

## License

Private repository - Telkomsel Halo Kampus System.
