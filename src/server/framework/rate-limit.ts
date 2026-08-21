import { withTransaction } from "@/server/db/client";
import type { Logger } from "./logger";

/**
 * Fixed-window rate limiting in Postgres, keyed by IP + operation
 * (B052). Fails **open** on a database error with a warning log — a
 * limiter that takes the whole system down when it breaks is worse than
 * the abuse it's meant to prevent. The tracking lookup is the one
 * exception: it fails **closed**, because that limit is a brute-force
 * control protecting a secret token, not a fairness control (ADR-005).
 */

export interface RateLimitConfig {
  operation: string;
  limit: number;
  windowSeconds: number;
  /** Tracking lookups fail closed; everything else fails open. */
  failClosed?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

function bucketKey(operation: string, ipHash: string, windowStart: number): string {
  return `${operation}:${ipHash}:${windowStart}`;
}

function currentWindowStart(windowSeconds: number): number {
  return Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;
}

export async function checkRateLimit(
  ipHash: string,
  config: RateLimitConfig,
  logger: Logger,
): Promise<RateLimitResult> {
  const windowStart = currentWindowStart(config.windowSeconds);
  const key = bucketKey(config.operation, ipHash, windowStart);
  const retryAfterSeconds = windowStart + config.windowSeconds - Math.floor(Date.now() / 1000);

  try {
    // The transaction returns whether *this* call was admitted — never a
    // raw counter compared again outside the transaction, which is what
    // produced an off-by-one in the Firestore-era version. `FOR UPDATE`
    // gives Postgres a real row lock, so two concurrent callers in the
    // same window are serialized rather than racing an optimistic retry.
    const allowed = await withTransaction(async (tx) => {
      const [existing] = await tx<
        { count: number }[]
      >`select count from rate_limits where bucket_key = ${key} for update`;
      const current = existing?.count ?? 0;
      if (current >= config.limit) {
        return false;
      }
      await tx`
        insert into rate_limits (bucket_key, count, operation, window_start)
        values (${key}, 1, ${config.operation}, to_timestamp(${windowStart}))
        on conflict (bucket_key) do update set count = rate_limits.count + 1
      `;
      return true;
    });

    return { allowed, retryAfterSeconds };
  } catch (error) {
    logger.warn("rate_limit_check_failed", {
      operation: config.operation,
      message: error instanceof Error ? error.message : String(error),
      fail_closed: Boolean(config.failClosed),
    });
    return { allowed: !config.failClosed, retryAfterSeconds };
  }
}

/** SHA-256 of the caller's IP, so raw IPs never sit in a rate-limit
 * row (PII minimisation, SECURITY.md). */
export async function hashIp(ip: string): Promise<string> {
  const encoded = new TextEncoder().encode(ip);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
