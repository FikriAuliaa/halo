/**
 * Structured JSON logging with a per-request correlation ID (ADR-010).
 * Redaction happens centrally, here, not at each call site — "a rule
 * enforced at every call site is a rule that will eventually be forgotten
 * at one" (B051).
 */

// Field names that must never appear verbatim in a log line, wherever they
// occur in the logged payload — ADR-010's redaction rule, keyed by field
// name rather than by event type so a new event can't accidentally forget
// to redact an already-known-sensitive field.
const REDACTED_KEYS = new Set([
  "full_name",
  "whatsapp",
  "email",
  "tracking_token",
  "admin_note",
  "payment_proof_path",
]);

const REDACTED_VALUE = "[REDACTED]";

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = REDACTED_KEYS.has(key) ? REDACTED_VALUE : redact(val);
    }
    return result;
  }
  return value;
}

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  correlation_id: string;
  event: string;
  [key: string]: unknown;
}

export interface Logger {
  info(event: string, payload?: Record<string, unknown>): void;
  warn(event: string, payload?: Record<string, unknown>): void;
  error(event: string, payload?: Record<string, unknown>): void;
}

function write(
  level: LogLevel,
  correlationId: string,
  event: string,
  payload: Record<string, unknown>,
) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    correlation_id: correlationId,
    event,
    ...(redact(payload) as Record<string, unknown>),
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function createLogger(correlationId: string): Logger {
  return {
    info: (event, payload = {}) => write("info", correlationId, event, payload),
    warn: (event, payload = {}) => write("warn", correlationId, event, payload),
    error: (event, payload = {}) => write("error", correlationId, event, payload),
  };
}

export function generateCorrelationId(): string {
  return crypto.randomUUID();
}
