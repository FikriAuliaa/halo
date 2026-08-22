import { sql } from "@/server/db/client";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { loadCleanupJobStatus } from "./admin/dashboard-metrics";

const REQUIRED_CONFIG_KEYS = ["system", "packages", "universities", "payment"] as const;
const REQUIRED_BUCKETS = ["proofs", "payment-assets"] as const;

export interface ComponentStatus {
  name: string;
  healthy: boolean;
  /** A short, safe reason — never a raw driver error, stack trace, host,
   * or version string (B128's own constraint: neither health endpoint
   * may leak internal detail to an unauthenticated caller). */
  detail?: string;
}

export interface ReadinessResult {
  ready: boolean;
  components: ComponentStatus[];
}

async function checkDatabase(): Promise<ComponentStatus> {
  try {
    await sql`select 1`;
    return { name: "database", healthy: true };
  } catch {
    return { name: "database", healthy: false, detail: "unreachable" };
  }
}

async function checkConfig(): Promise<ComponentStatus> {
  try {
    const rows = await sql<{ key: string }[]>`select key from config`;
    const present = new Set(rows.map((r) => r.key));
    const missing = REQUIRED_CONFIG_KEYS.filter((key) => !present.has(key));
    if (missing.length > 0) {
      return { name: "config", healthy: false, detail: `missing: ${missing.join(", ")}` };
    }
    return { name: "config", healthy: true };
  } catch {
    return { name: "config", healthy: false, detail: "unreachable" };
  }
}

async function checkStorage(): Promise<ComponentStatus> {
  try {
    const { data, error } = await supabaseAdmin.storage.listBuckets();
    if (error) return { name: "storage", healthy: false, detail: "unreachable" };
    const present = new Set((data ?? []).map((b) => b.id));
    const missing = REQUIRED_BUCKETS.filter((id) => !present.has(id));
    if (missing.length > 0) {
      return { name: "storage", healthy: false, detail: `missing bucket: ${missing.join(", ")}` };
    }
    return { name: "storage", healthy: true };
  } catch {
    return { name: "storage", healthy: false, detail: "unreachable" };
  }
}

/**
 * `GET /api/health/ready` (B128). Liveness (`/api/health`) intentionally
 * checks none of this — a transient database blip must not restart an
 * otherwise-healthy process, only stop it from being sent traffic.
 * Readiness may, and does: Postgres reachable, every required `config`
 * row present, both Storage buckets present.
 */
export async function checkReadiness(): Promise<ReadinessResult> {
  const components = await Promise.all([checkDatabase(), checkConfig(), checkStorage()]);
  return { ready: components.every((c) => c.healthy), components };
}

export interface DiagnosticsResult extends ReadinessResult {
  cleanup_job: {
    stale_or_unknown: boolean;
    last_run_minutes_ago: number | null;
  };
}

/** The admin-only diagnostics view (B128) — readiness plus the cleanup
 * job's own status, which isn't otherwise something an unauthenticated
 * health check should reveal (it's operational detail, not a go/no-go
 * signal for load balancer traffic). */
export async function getDiagnostics(): Promise<DiagnosticsResult> {
  const [readiness, cleanupStatus] = await Promise.all([checkReadiness(), loadCleanupJobStatus()]);
  return {
    ...readiness,
    cleanup_job: {
      stale_or_unknown: cleanupStatus.staleOrUnknown,
      last_run_minutes_ago:
        cleanupStatus.minutesAgo != null ? Math.round(cleanupStatus.minutesAgo) : null,
    },
  };
}
