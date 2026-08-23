import { describe, expect, it } from "vitest";
import { createLogger } from "./logger";
import { checkRateLimit, hashIp } from "./rate-limit";

const logger = createLogger("test-correlation");

function freshIpHash(): Promise<string> {
  return hashIp(`10.0.0.${Math.floor(Math.random() * 1_000_000)}`);
}

describe("checkRateLimit", () => {
  it("allows requests up to the configured limit", async () => {
    const ip = await freshIpHash();
    const config = { operation: "test-op-a", limit: 3, windowSeconds: 60 };
    for (let i = 0; i < 3; i++) {
      const result = await checkRateLimit(ip, config, logger);
      expect(result.allowed).toBe(true);
    }
  }, 15000);

  it("rejects a request beyond the limit within the same window", async () => {
    const ip = await freshIpHash();
    const config = { operation: "test-op-b", limit: 2, windowSeconds: 60 };
    await checkRateLimit(ip, config, logger);
    await checkRateLimit(ip, config, logger);
    const third = await checkRateLimit(ip, config, logger);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks separate buckets per operation for the same IP", async () => {
    const ip = await freshIpHash();
    const configA = { operation: "test-op-c1", limit: 1, windowSeconds: 60 };
    const configB = { operation: "test-op-c2", limit: 1, windowSeconds: 60 };
    expect((await checkRateLimit(ip, configA, logger)).allowed).toBe(true);
    expect((await checkRateLimit(ip, configA, logger)).allowed).toBe(false);
    // A different operation for the same IP has its own independent bucket.
    expect((await checkRateLimit(ip, configB, logger)).allowed).toBe(true);
  });

  it("tracks separate buckets per IP for the same operation", async () => {
    const ipA = await freshIpHash();
    const ipB = await freshIpHash();
    const config = { operation: "test-op-d", limit: 1, windowSeconds: 60 };
    expect((await checkRateLimit(ipA, config, logger)).allowed).toBe(true);
    expect((await checkRateLimit(ipA, config, logger)).allowed).toBe(false);
    expect((await checkRateLimit(ipB, config, logger)).allowed).toBe(true);
  });

  it("resets after the window elapses (short window, real wait)", async () => {
    const ip = await freshIpHash();
    const windowSeconds = 2;
    const config = { operation: "test-op-e", limit: 1, windowSeconds };

    // Align to just after a fresh window boundary so both initial checks
    // are guaranteed to land in the same window, regardless of exactly
    // when the test happens to run — otherwise this is flaky precisely at
    // whatever moment the window rolls over mid-test (caught during B054's
    // full-suite run, though it passed in isolation).
    const msIntoWindow = Date.now() % (windowSeconds * 1000);
    await new Promise((resolve) => setTimeout(resolve, windowSeconds * 1000 - msIntoWindow + 50));

    expect((await checkRateLimit(ip, config, logger)).allowed).toBe(true);
    expect((await checkRateLimit(ip, config, logger)).allowed).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, windowSeconds * 1000));
    expect((await checkRateLimit(ip, config, logger)).allowed).toBe(true);
  });
});

describe("hashIp", () => {
  it("is deterministic for the same input", async () => {
    const a = await hashIp("203.0.113.5");
    const b = await hashIp("203.0.113.5");
    expect(a).toBe(b);
  });

  it("never reveals the plaintext IP in its output", async () => {
    const hash = await hashIp("203.0.113.5");
    expect(hash).not.toContain("203.0.113.5");
  });
});
