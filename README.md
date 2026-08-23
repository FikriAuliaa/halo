# 🔴 Telkomsel Halo Kampus — Number Ordering & Inventory Management System

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Cloud_Postgres-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=flat-square&logo=docker)](https://www.docker.com/)
[![Vitest](https://img.shields.io/badge/Vitest-382_Tests_Passed-6E9F18?style=flat-square&logo=vitest)](https://vitest.dev/)

**Telkomsel Halo Kampus** is an enterprise-grade, serverless web application and inventory control platform designed for university students to browse, reserve, and order exclusive Telkomsel Halo phone numbers with customized campus data packages.

The platform guarantees **zero inventory conflict** across online student self-service and direct campus sales teams through atomic database transaction locks, automated reservation lifecycles, and a multi-role administrative portal.

---

## 📑 Table of Contents

- [Key Business Capabilities](#-key-business-capabilities)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [System Features](#-system-features)
  - [Student Self-Service Portal](#1-student-self-service-portal)
  - [Administrative Operations Portal](#2-administrative-operations-portal)
  - [Role-Based Access Control (RBAC)](#3-role-based-access-control-rbac)
- [Prerequisites](#-prerequisites)
- [Environment Configuration](#-environment-configuration)
- [Local Development Setup](#-local-development-setup)
- [Database Migration & Seeding System](#-database-migration--seeding-system)
- [Docker & Staging VPS Deployment](#-docker--staging-vps-deployment)
  - [Option A: Running with Docker Compose (Recommended)](#option-a-running-with-docker-compose-recommended)
  - [Option B: Manual Docker Image Build & Execution](#option-b-manual-docker-image-build--execution)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [API Routes Specification](#-api-routes-specification)
- [Maintainer & License](#-maintainer--license)

---

## 🌟 Key Business Capabilities

- **Single-Source Inventory Locking**: Prevents double-selling numbers between online student reservations and direct campus booth sales teams using Postgres row-level `FOR UPDATE` transaction locks.
- **Login-Free Student Experience**: Students reserve numbers and complete purchases without registration friction, tracked via session tokens and secure URL parameters.
- **Automated Reservation Cleanup**: Expired number reservations (default 15-minute window) are automatically released back to the available pool by a background janitor service.
- **Secure Proof Verification**: Payment transfer receipts are processed through server-side Sharp re-encoding to strip malicious EXIF/metadata and stored in private Supabase Cloud Storage.
- **Dual-Role Management**: Role-based access control segregates superadmin capabilities (`ADMIN_TELKOMSEL`) from regional university administrators (`ADMIN_KAMPUS`).

---

## 🏗️ Architecture & Tech Stack

```mermaid
graph TD
    User[Student / Admin Browser] -->|HTTP / HTTPS| Edge[Next.js Middleware & Security]
    Edge -->|Routing & Auth Guard| App[Next.js 15 App Router]
    App -->|Domain Logic & Zod Validation| Server[Server Actions / API Handlers]
    Server -->|Postgres Client / FOR UPDATE| DB[(Supabase Cloud Postgres)]
    Server -->|Sharp Re-encoding| Storage[(Supabase Storage Buckets)]
    Server -->|Audit Trail & Sessions| Auth[(Supabase Auth Service)]
```

- **Framework**: Next.js 15.5 (App Router, Standalone Server Output Mode)
- **UI & Logic**: React 19, TypeScript strict mode, Vanilla CSS + Tailwind CSS v3.4 (Telkomsel Crimson Pulse Design System)
- **Iconography & Fonts**: Material Symbols Outlined, Hanken Grotesk, Inter (Google Fonts with CSP Whitelisting)
- **Database Layer**: Supabase Cloud PostgreSQL with Row Level Security (RLS) & `postgres.js` transaction client
- **Storage Layer**: Supabase Cloud Storage (`proofs` private bucket for receipts, `payment-assets` public bucket for QRIS)
- **Security**: CSP Nonce Generation, Rate Limiting (IP Hash), Sharp EXIF Sanitization, OWASP Top 10 Protections
- **Containerization**: Multi-stage Dockerfile (`node:22-alpine`), `docker-compose` staging environment

---

## ✨ System Features

### 1. Student Self-Service Portal

- **Home Landing (`/`)**: High-converting Telkomsel Halo Crimson Pulse promotional landing page.
- **Number Inventory Catalog (`/data`)**: Real-time searchable and filterable grid of 96 available numbers with digit pattern highlights.
- **Package Selection (`/paket`)**: Flexible data package picker (Halo+ 70GB, 120GB, 160GB, 220GB, 300GB) with campus selection.
- **QRIS Payment Portal (`/bayar`)**: Live QRIS code rendering, countdown timer for active reservations, and receipt image upload.
- **Order Confirmation & Tracking (`/konfirmasi`, `/lacak`)**: Instant order reference tracking (`REF-XXXXX`) with live status updates.

### 2. Administrative Operations Portal

- **Dashboard Overview (`/admin`)**: Bento-box metrics grid (Pending Verification, Verified Today, Rejected Today, Available, Reserved, Sold) with real-time recent order feeds.
- **Order Verification (`/admin/pesanan`, `/admin/pesanan/[id]`)**: Detailed receipt inspection modal, single-click verification/rejection with customer notification logs.
- **Inventory Management (`/admin/nomor`)**: Add single/bulk numbers, force release stuck reservations, mark offline sales from campus booths.
- **Configuration Engine (`/admin/konfigurasi/*`)**:
  - **Packages Configuration (`/admin/konfigurasi/paket`)**: Edit quota limits, draft prices, and confirm official Telkomsel pricing.
  - **Universities Configuration (`/admin/konfigurasi/kampus`)**: Add/remove partner campuses and toggle active status.
  - **Payment Configuration (`/admin/konfigurasi/pembayaran`)**: Upload new QRIS images and update payment labels.
- **Diagnostics Dashboard (`/admin/diagnostics`)**: Live database, storage, and config health checks, plus manual trigger for the janitor cleanup task.

### 3. Role-Based Access Control (RBAC)

| Feature / Action                  | `ADMIN_TELKOMSEL` (Superadmin) | `ADMIN_KAMPUS` (Campus Admin) |
| :-------------------------------- | :----------------------------: | :---------------------------: |
| View Dashboard & Analytics        |               ✅               |              ✅               |
| Verify / Reject Student Orders    |               ✅               |              ✅               |
| Mark Numbers as Sold Offline      |               ✅               |              ✅               |
| Add / Delete Inventory Numbers    |               ✅               |              ❌               |
| Force Release Active Reservations |               ✅               |              ❌               |
| Edit Data Packages & Prices       |               ✅               |              ❌               |
| Manage Partner Universities       |               ✅               |              ❌               |
| Update Payment QRIS Asset         |               ✅               |              ❌               |

---

## 🛠️ Prerequisites

Ensure your development environment meets the following software requirements:

- **Node.js**: `v20.0.0` or `v22.x` (Recommended)
- **Package Manager**: `pnpm` v9.x or v10.x (`corepack enable`)
- **Git**: `v2.x`
- **Docker & Docker Compose**: (Required for containerized staging/deployment)
- **Supabase Cloud Account** (or local Supabase instance via Supabase CLI)

---

## 🔐 Environment Configuration

Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

### Environment Variables Reference

| Variable                    | Required | Description                                         | Example                                                                                   |
| :-------------------------- | :------: | :-------------------------------------------------- | :---------------------------------------------------------------------------------------- |
| `DATABASE_URL`              | **Yes**  | Postgres direct connection string                   | `postgres://postgres.[ref]:[pass]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres` |
| `SUPABASE_URL`              | **Yes**  | Supabase Cloud API URL                              | `https://hvrkjufbytifohhplmsh.supabase.co`                                                |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes**  | Supabase Service Role Key (Server-only)             | `eyJhbGciOiJIUzI...`                                                                      |
| `SESSION_COOKIE_SECRET`     | **Yes**  | Secret for session cookie encryption (min 32 chars) | `your-super-secret-random-key-32-chars-min`                                               |
| `ADMIN_INIT_PASSWORD`       | Optional | Initial password for admin account bootstrapping    | `Admin123456!`                                                                            |
| `PORT`                      | Optional | HTTP port for the web server (Default: 3000)        | `3000`                                                                                    |

---

## 🚀 Local Development Setup

Follow these step-by-step instructions to get the application running locally:

### 1. Clone the Repository & Install Dependencies

```bash
git clone https://github.com/galiihajiip/halo.git
cd halo
pnpm install
```

### 2. Configure Environment Variables

Populate your `.env` file with valid Supabase credentials (see [Environment Configuration](#-environment-configuration)).

### 3. Run Database Migrations & Seed Data

Execute the automated migration runner to apply database schemas, system configurations, and number pool inventory:

```bash
pnpm migrate
```

Alternatively, run individual seed commands manually if needed:

```bash
# Seed system packages, universities, and payment config
pnpm seed:config

# Seed the 96 phone numbers inventory dataset
pnpm seed

# Create initial admin account
pnpm bootstrap-admin --email=admin@telkomsel.co.id
```

### 4. Start the Development Server

```bash
pnpm dev
```

The application will be available at:

- **Student Portal**: [http://localhost:3000](http://localhost:3000)
- **Admin Login**: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

---

## 🗄️ Database Migration & Seeding System

Database migrations are stored as ordered SQL files in `supabase/migrations/`:

```
supabase/migrations/
├── 20260101000000_init.sql                # Core schemas, tables, enums & indexes
├── 20260101000100_reservation_cleanup.sql # Reservation cleanup functions & triggers
└── 20260101000200_storage.sql             # Supabase storage buckets & RLS policies
```

### Migration Runner (`scripts/migrate.ts`)

The `pnpm migrate` command automatically:

1. Creates a `_migrations` tracking table in Postgres if it does not exist.
2. Inspects `supabase/migrations/*.sql` and executes unapplied migrations in chronological order.
3. Detects if system tables are empty and automatically runs configuration and inventory seeds.
4. Bootstraps the default superadmin user (`admin@telkomsel.co.id`).

---

## 🐳 Docker & Staging VPS Deployment

The application includes a production-ready, multi-stage `Dockerfile` (built on `node:22-alpine`) and a `docker-compose.yml` configuration.

### Option A: Running with Docker Compose (Recommended)

1. Ensure your `.env` file is configured on the VPS.
2. Build and start the container in detached mode:

```bash
docker compose up -d --build
```

3. View live container logs:

```bash
docker compose logs -f web
```

4. Stop the application:

```bash
docker compose down
```

### Option B: Manual Docker Image Build & Execution

1. Build the standalone production Docker image:

```bash
docker build -t halo-kampus:latest .
```

2. Run the Docker container:

```bash
docker run -d \
  --name halo_kampus_app \
  -p 3000:3000 \
  --env-file .env \
  halo-kampus:latest
```

3. Check health status via container healthcheck:

```bash
docker inspect --format='{{json .State.Health}}' halo_kampus_app
```

---

## 🧪 Testing & Quality Assurance

The codebase features a comprehensive automated testing suite built with Vitest, Playwright, TypeScript, and ESLint.

### Command Matrix

| Command                 | Purpose                             | Expected Output                  |
| :---------------------- | :---------------------------------- | :------------------------------- |
| `pnpm typecheck`        | TypeScript static type checking     | `tsc --noEmit` (0 errors)        |
| `pnpm lint`             | ESLint static code analysis         | ESLint (0 warnings/errors)       |
| `pnpm test`             | Complete Vitest test suite          | 44 test files, 382 tests PASSED  |
| `pnpm test:unit`        | Unit tests (domain logic & schemas) | All domain tests PASSED          |
| `pnpm test:component`   | React component tests (jsdom)       | All component tests PASSED       |
| `pnpm test:integration` | API route & DB integration tests    | All server tests PASSED          |
| `pnpm test:rules`       | Storage & Postgres RLS policy tests | All RLS security tests PASSED    |
| `pnpm test:e2e`         | End-to-end Playwright tests         | E2E browser flows PASSED         |
| `pnpm build`            | Production build validation         | Next.js standalone build success |

---

## 📡 API Routes Specification

### Student Public Endpoints

| Endpoint                    | Method | Description                                           |
| :-------------------------- | :----: | :---------------------------------------------------- |
| `/api/numbers`              | `GET`  | List available numbers with pattern & price filtering |
| `/api/numbers/[id]/reserve` | `POST` | Atomically reserve a phone number (15-min lock)       |
| `/api/packages`             | `GET`  | Retrieve active data packages & pricing               |
| `/api/universities`         | `GET`  | Retrieve partner university list                      |
| `/api/orders`               | `POST` | Submit student order information & payment proof      |
| `/api/track`                | `GET`  | Track order status by reference code (`REF-XXXXX`)    |
| `/api/health/ready`         | `GET`  | System readiness check (DB, Config, Storage)          |

### Admin Protected Endpoints

| Endpoint                                |     Method     |   Authorization   | Description                             |
| :-------------------------------------- | :------------: | :---------------: | :-------------------------------------- |
| `/api/admin/session`                    | `GET` / `POST` |   Authenticated   | Retrieve current session or login       |
| `/api/admin/dashboard`                  |     `GET`      |   Authenticated   | Retrieve dashboard overview metrics     |
| `/api/admin/orders`                     |     `GET`      |   Authenticated   | List all student orders with filters    |
| `/api/admin/orders/[id]/verify`         |     `POST`     |   Authenticated   | Mark order as verified                  |
| `/api/admin/orders/[id]/reject`         |     `POST`     |   Authenticated   | Reject order with reason note           |
| `/api/admin/numbers`                    |     `POST`     | `ADMIN_TELKOMSEL` | Add single or bulk numbers              |
| `/api/admin/numbers/[id]/force-release` |     `POST`     | `ADMIN_TELKOMSEL` | Force release an active reservation     |
| `/api/admin/numbers/sold-offline`       |     `POST`     |   Authenticated   | Mark number as sold at campus booth     |
| `/api/admin/config/packages`            |     `POST`     | `ADMIN_TELKOMSEL` | Update data packages & draft pricing    |
| `/api/admin/config/universities`        |     `POST`     | `ADMIN_TELKOMSEL` | Update partner university list          |
| `/api/admin/config/payment`             |     `POST`     | `ADMIN_TELKOMSEL` | Upload new QRIS asset & payment label   |
| `/api/admin/cleanup/run`                |     `POST`     |   Authenticated   | Trigger manual database janitor cleanup |

---

## 👤 Maintainer & License

- **Developer / Maintainer**: `galiihajiip` ([gajipgaming@gmail.com](mailto:gajipgaming@gmail.com))
- **Repository**: [https://github.com/galiihajiip/halo.git](https://github.com/galiihajiip/halo.git)
- **License**: Private & Proprietary — Telkomsel Halo Kampus Project. All rights reserved.
