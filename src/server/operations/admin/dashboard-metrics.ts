import { sql } from "@/server/db/client";

export interface DashboardMetrics {
  numbers: {
    available: number;
    reserved: number;
    pending: number;
    sold: number;
    sold_offline: number;
  };
  orders_pending: number;
  orders_verified_today: number;
  orders_rejected_today: number;
  /** Minutes, or `null` when there's no pending order at all. */
  oldest_pending_order_age_minutes: number | null;
  recent_orders: Array<{
    id: string;
    order_ref: string;
    number: string;
    full_name: string;
    status: string;
    submitted_at: string;
  }>;
  alerts: {
    stale_pending_orders: number;
    cleanup_job_stale: boolean;
    cleanup_job_last_run_minutes_ago: number | null;
  };
  generated_at: string;
}

const CACHE_TTL_MS = 30_000;
const CLEANUP_STALE_THRESHOLD_MINUTES = 15; // matches the 2-minute schedule with generous slack (OPERATIONS.md)

let cached: { value: DashboardMetrics; expiresAt: number } | null = null;

/** Exported for `src/server/operations/health.ts`'s readiness check and
 * the admin diagnostics page — both want the same cleanup-job status
 * this dashboard already computes. */
export async function loadCleanupJobStatus(): Promise<{
  staleOrUnknown: boolean;
  minutesAgo: number | null;
}> {
  try {
    const [row] = await sql<{ minutes_ago: number | null }[]>`
      select extract(epoch from (now() - max(jrd.end_time))) / 60 as minutes_ago
      from cron.job_run_details jrd
      join cron.job j on j.jobid = jrd.jobid
      where j.jobname = 'cleanup-expired-reservations'
    `;
    const minutesAgo = row?.minutes_ago ?? null;
    return {
      staleOrUnknown: minutesAgo === null || minutesAgo > CLEANUP_STALE_THRESHOLD_MINUTES,
      minutesAgo,
    };
  } catch {
    // `pg_cron` unavailable in this environment, or no run yet — treat as
    // unknown/stale rather than crashing the whole dashboard over it.
    return { staleOrUnknown: true, minutesAgo: null };
  }
}

async function computeMetrics(): Promise<DashboardMetrics> {
  const [numberCounts] = await sql<
    { available: string; reserved: string; pending: string; sold: string; sold_offline: string }[]
  >`
    select
      count(*) filter (where status = 'available') as available,
      count(*) filter (where status = 'reserved' and reserved_until > now()) as reserved,
      count(*) filter (where status = 'pending') as pending,
      count(*) filter (where status = 'sold') as sold,
      count(*) filter (where status = 'sold_offline') as sold_offline
    from numbers
  `;

  const [orderCounts] = await sql<
    { pending: string; verified_today: string; rejected_today: string }[]
  >`
    select
      count(*) filter (where status = 'pending') as pending,
      count(*) filter (where status = 'verified' and verified_at >= date_trunc('day', now())) as verified_today,
      count(*) filter (where status = 'rejected' and verified_at >= date_trunc('day', now())) as rejected_today
    from orders
  `;

  const [oldestPending] = await sql<{ age_minutes: number | null }[]>`
    select extract(epoch from (now() - min(submitted_at))) / 60 as age_minutes
    from orders where status = 'pending'
  `;

  const [stalePending] = await sql<{ count: string }[]>`
    select count(*) from orders
    where status = 'pending' and submitted_at < now() - interval '24 hours'
  `;

  const recentOrdersRows = await sql<
    Array<{
      id: string;
      order_ref: string;
      number: string;
      full_name: string;
      status: string;
      submitted_at: Date;
    }>
  >`
    select id, order_ref, number, full_name, status, submitted_at
    from orders order by submitted_at desc limit 10
  `;

  const cleanupStatus = await loadCleanupJobStatus();

  return {
    numbers: {
      available: Number(numberCounts?.available ?? 0),
      reserved: Number(numberCounts?.reserved ?? 0),
      pending: Number(numberCounts?.pending ?? 0),
      sold: Number(numberCounts?.sold ?? 0),
      sold_offline: Number(numberCounts?.sold_offline ?? 0),
    },
    orders_pending: Number(orderCounts?.pending ?? 0),
    orders_verified_today: Number(orderCounts?.verified_today ?? 0),
    orders_rejected_today: Number(orderCounts?.rejected_today ?? 0),
    oldest_pending_order_age_minutes:
      oldestPending?.age_minutes != null ? Math.round(oldestPending.age_minutes) : null,
    recent_orders: recentOrdersRows.map((row) => ({
      id: row.id,
      order_ref: row.order_ref,
      number: row.number,
      full_name: row.full_name,
      status: row.status,
      submitted_at: row.submitted_at.toISOString(),
    })),
    alerts: {
      stale_pending_orders: Number(stalePending?.count ?? 0),
      cleanup_job_stale: cleanupStatus.staleOrUnknown,
      cleanup_job_last_run_minutes_ago:
        cleanupStatus.minutesAgo != null ? Math.round(cleanupStatus.minutesAgo) : null,
    },
    generated_at: new Date().toISOString(),
  };
}

/**
 * `adminGetDashboardMetrics` (B099). The `reserved` count uses effective
 * status (`reserved_until > now()`) so an expired-but-uncleaned
 * reservation is never counted as reserved — the dashboard would
 * otherwise mislead exactly when the janitor is failing, which is
 * precisely when it must not (ADR-004). Cached 30s in-process; a
 * dashboard is not a real-time console.
 */
export async function adminGetDashboardMetrics(): Promise<DashboardMetrics> {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }
  const value = await computeMetrics();
  cached = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}
