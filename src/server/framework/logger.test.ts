import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLogger, generateCorrelationId, redact } from "./logger";

describe("redact", () => {
  it("redacts a known-sensitive top-level field", () => {
    const result = redact({ full_name: "Budi Santoso", university: "UNAIR" }) as Record<
      string,
      unknown
    >;
    expect(result.full_name).toBe("[REDACTED]");
    expect(result.university).toBe("UNAIR");
  });

  it("redacts sensitive fields nested inside an object", () => {
    const result = redact({
      order: { email: "budi@example.com", package_id: "pkg_160gb" },
    }) as Record<string, unknown>;
    const order = result.order as Record<string, unknown>;
    expect(order.email).toBe("[REDACTED]");
    expect(order.package_id).toBe("pkg_160gb");
  });

  it("redacts sensitive fields inside an array of objects", () => {
    const result = redact([
      { whatsapp: "+6281234567890" },
      { whatsapp: "+6281111111111" },
    ]) as Record<string, unknown>[];
    expect(result[0]?.whatsapp).toBe("[REDACTED]");
    expect(result[1]?.whatsapp).toBe("[REDACTED]");
  });

  it("never logs a tracking token plaintext, even nested", () => {
    const result = redact({ meta: { tracking_token: "super-secret-token" } }) as Record<
      string,
      unknown
    >;
    const meta = result.meta as Record<string, unknown>;
    expect(meta.tracking_token).toBe("[REDACTED]");
    expect(JSON.stringify(result)).not.toContain("super-secret-token");
  });

  it("leaves non-sensitive primitive values untouched", () => {
    expect(redact("plain string")).toBe("plain string");
    expect(redact(42)).toBe(42);
    expect(redact(null)).toBe(null);
  });
});

describe("generateCorrelationId", () => {
  it("produces distinct IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, generateCorrelationId));
    expect(ids.size).toBe(100);
  });
});

describe("createLogger", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("every log line carries the correlation ID passed at creation", () => {
    const logger = createLogger("corr-123");
    logger.info("test_event", { foo: "bar" });
    const line = JSON.parse((console.log as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string);
    expect(line.correlation_id).toBe("corr-123");
    expect(line.event).toBe("test_event");
  });

  it("a deliberate PII log attempt comes out redacted", () => {
    const logger = createLogger("corr-abc");
    logger.info("order_submitted", { full_name: "Budi Santoso", package_id: "pkg_70gb" });
    const line = JSON.parse((console.log as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string);
    expect(line.full_name).toBe("[REDACTED]");
    expect(line.package_id).toBe("pkg_70gb");
  });

  it("routes warn/error to their respective console methods", () => {
    const logger = createLogger("corr-xyz");
    logger.warn("rate_limit_triggered", {});
    logger.error("unhandled_exception", {});
    expect(console.warn).toHaveBeenCalledOnce();
    expect(console.error).toHaveBeenCalledOnce();
  });
});
