-- Scheduled reservation cleanup (B067) — the Postgres/pg_cron replacement
-- for the originally-planned Cloud Function. Not load-bearing for
-- correctness (ADR-004): every read path already applies lazy expiry
-- (`reserved_until <= now()` treated as available) before trusting the
-- stored `status`. This exists purely for hygiene — keeping stored state
-- and the admin dashboard's counts honest — and its own downtime never
-- produces an incorrect reservation outcome.
--
-- One implementation, two triggers: `cron.schedule` below calls it every
-- two minutes, and `adminRunCleanup` (B068) calls the exact same function
-- on demand via `select * from cleanup_expired_reservations()` — logic is
-- never duplicated between the scheduled and manual paths.

create function cleanup_expired_reservations(batch_limit integer default 500)
returns table (scanned integer, released integer) as $$
begin
  return query
  with candidates as (
    select number from numbers
    where status = 'reserved' and reserved_until <= now()
    order by reserved_until
    limit batch_limit
    for update skip locked
  ),
  updated as (
    update numbers n
    set status = 'available',
        reserved_at = null,
        reserved_until = null,
        session_id = null,
        reservation_id = null,
        order_ref = null,
        tracking_token_hash = null
    from candidates c
    where n.number = c.number
    returning n.number
  )
  select
    (select count(*) from candidates)::integer as scanned,
    (select count(*) from updated)::integer as released;
end;
$$ language plpgsql;

-- `pg_cron` is enabled by default on Supabase-managed Postgres; the local
-- CLI stack enables it automatically when a migration references it. If a
-- given environment truly has no pg_cron (e.g. a bare, non-Supabase
-- Postgres used only for schema validation), this statement is the one
-- part of the migration that would need to be skipped there.
create extension if not exists pg_cron;

select cron.schedule(
  'cleanup-expired-reservations',
  '*/2 * * * *',
  $$select cleanup_expired_reservations();$$
);
