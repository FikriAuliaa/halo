import type { Logger } from "@/server/framework/logger";

/**
 * Structured reservation lifecycle events (B069). Wraps `Logger.info`
 * (already correlation-ID-tagged and centrally redacted) with typed,
 * fire-and-forget emitters — a logging failure here never fails the
 * request it's describing, and a phone number never appears where the
 * number ID already suffices (it's business data, not PII, but there's
 * still no reason to duplicate it into every log line). `session_id` is
 * hashed, never logged verbatim, matching the tracking-token hashing
 * convention already used for persisted state (ADR-005).
 */

async function hashSessionId(sessionId: string): Promise<string> {
  const encoded = new TextEncoder().encode(sessionId);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16); // a short, log-friendly correlation fingerprint — not a secret to protect, just not the raw ID.
}

function emit(logger: Logger, event: string, payload: Record<string, unknown>): void {
  try {
    logger.info(event, payload);
  } catch {
    // Never let an observability failure fail the request it's describing.
  }
}

export async function reservationCreated(
  logger: Logger,
  params: { number: string; sessionId: string; orderRef: string },
): Promise<void> {
  emit(logger, "reservation_created", {
    number: params.number,
    order_ref: params.orderRef,
    session_id_hash: await hashSessionId(params.sessionId),
  });
}

export async function reservationFailed(
  logger: Logger,
  params: { number: string; sessionId: string; reason: string },
): Promise<void> {
  emit(logger, "reservation_failed", {
    number: params.number,
    reason: params.reason,
    session_id_hash: await hashSessionId(params.sessionId),
  });
}

export function reservationExpired(logger: Logger, params: { number: string }): void {
  emit(logger, "reservation_expired", { number: params.number });
}

export async function reservationReleased(
  logger: Logger,
  params: { number: string; sessionId: string; forcedByAdmin?: boolean },
): Promise<void> {
  emit(logger, "reservation_released", {
    number: params.number,
    session_id_hash: await hashSessionId(params.sessionId),
    forced_by_admin: params.forcedByAdmin ?? false,
  });
}

export function reservationTakenOver(logger: Logger, params: { number: string }): void {
  emit(logger, "reservation_taken_over", { number: params.number });
}

export function cleanupRun(
  logger: Logger,
  params: { scanned: number; released: number; durationMs: number },
): void {
  emit(logger, "cleanup_run", {
    scanned: params.scanned,
    released: params.released,
    duration_ms: params.durationMs,
  });
}
