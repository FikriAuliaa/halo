import { sql } from "@/server/db/client";

export interface CleanupSummary {
  scanned: number;
  released: number;
}

/**
 * `adminRunCleanup` (B068) — invokes the exact same Postgres function
 * `pg_cron` calls every two minutes (`cleanup_expired_reservations`,
 * B067's migration), so the manual and scheduled paths can never drift
 * apart. Role enforcement (`ADMIN_TELKOMSEL` only) happens at the route.
 */
export async function adminRunCleanup(batchLimit = 500): Promise<CleanupSummary> {
  const [row] = await sql<
    CleanupSummary[]
  >`select * from cleanup_expired_reservations(${batchLimit})`;
  return row ?? { scanned: 0, released: 0 };
}
