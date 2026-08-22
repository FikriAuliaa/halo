-- Halo Number Ordering System — initial schema (Supabase/Postgres).
-- Mirrors the collections previously modelled in Firestore (see
-- DATA_MODEL.md); RLS is enabled with no policies on every table, so the
-- only access path is the server's service-role connection — the same
-- deny-by-default posture as the old Firestore security rules. No
-- anon/authenticated Data API role is ever granted anything here.

create extension if not exists pgcrypto;

create type number_status as enum ('available', 'reserved', 'pending', 'sold', 'sold_offline');
create type order_status as enum ('pending', 'verified', 'rejected');
create type sold_channel as enum ('online', 'offline');
create type admin_role as enum ('ADMIN_KAMPUS', 'ADMIN_TELKOMSEL');

-- Auto-maintains `updated_at` on every UPDATE — the Postgres equivalent of
-- the old converter layer's "updated_at is always server-set, never
-- accepted from the caller" rule.
create function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- numbers
-- ---------------------------------------------------------------------------

create table numbers (
  number text primary key,
  status number_status not null default 'available',
  reserved_at timestamptz,
  reserved_until timestamptz,
  session_id text,
  reservation_id text,
  order_ref text,
  tracking_token_hash text,
  sold_at timestamptz,
  sold_channel sold_channel,
  updated_at timestamptz not null default now()
);

create index numbers_status_reserved_until_idx on numbers (status, reserved_until);
create index numbers_status_updated_at_idx on numbers (status, updated_at desc);

create trigger numbers_set_updated_at before update on numbers
  for each row execute function set_updated_at();

alter table numbers enable row level security;

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------

create table orders (
  id uuid primary key default gen_random_uuid(),
  number text not null references numbers (number),
  order_ref text not null,
  tracking_token_hash text not null,
  session_id text not null,
  full_name text not null,
  university text not null,
  whatsapp text not null,
  email text not null,
  package_id text not null,
  payment_proof_path text not null,
  status order_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by text,
  admin_note text,
  price_at_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index orders_order_ref_idx on orders (order_ref);
create index orders_status_submitted_at_idx on orders (status, submitted_at desc);
create index orders_status_university_submitted_at_idx on orders (status, university, submitted_at desc);
create index orders_ref_token_idx on orders (order_ref, tracking_token_hash);

create trigger orders_set_updated_at before update on orders
  for each row execute function set_updated_at();

alter table orders enable row level security;

-- ---------------------------------------------------------------------------
-- config — one row per document, JSONB payload (Zod-validated in the
-- application layer, same as the old Firestore config/* documents).
-- ---------------------------------------------------------------------------

create table config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger config_set_updated_at before update on config
  for each row execute function set_updated_at();

alter table config enable row level security;

-- ---------------------------------------------------------------------------
-- sessions
-- ---------------------------------------------------------------------------

create table sessions (
  id text primary key,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  current_reservation jsonb
);

alter table sessions enable row level security;

-- ---------------------------------------------------------------------------
-- audit_log — append-only, written in the same transaction as the
-- mutation it describes (ADR-010).
-- ---------------------------------------------------------------------------

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_uid text not null,
  actor_role admin_role not null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before jsonb,
  after jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index audit_log_entity_id_idx on audit_log (entity_id);

alter table audit_log enable row level security;

-- ---------------------------------------------------------------------------
-- idempotency_keys
-- ---------------------------------------------------------------------------

create table idempotency_keys (
  key text primary key,
  operation text not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

alter table idempotency_keys enable row level security;

-- ---------------------------------------------------------------------------
-- rate_limits
-- ---------------------------------------------------------------------------

create table rate_limits (
  bucket_key text primary key,
  count integer not null default 0,
  operation text not null,
  window_start timestamptz not null
);

alter table rate_limits enable row level security;

-- ---------------------------------------------------------------------------
-- admin_users — maps a Supabase Auth user to an admin role (ADR-002's
-- bootstrap script inserts rows here instead of setting a custom claim).
-- ---------------------------------------------------------------------------

create table admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role admin_role not null,
  created_at timestamptz not null default now()
);

alter table admin_users enable row level security;
