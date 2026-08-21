import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

describe("env validation", () => {
  it("loads successfully with no optional variables set", async () => {
    process.env = { NODE_ENV: "test" };
    await expect(import("./env")).resolves.toBeDefined();
  });

  it("fails fast with a message naming the offending variable when a value is malformed", async () => {
    process.env = { NODE_ENV: "test", RESERVATION_TTL_MINUTES_OVERRIDE: "not-a-number" };
    await expect(import("./env")).rejects.toThrow(/RESERVATION_TTL_MINUTES_OVERRIDE/);
  });

  it("rejects a session cookie secret shorter than 32 characters", async () => {
    process.env = { NODE_ENV: "test", SESSION_COOKIE_SECRET: "too-short" };
    await expect(import("./env")).rejects.toThrow(/SESSION_COOKIE_SECRET/);
  });

  it("accepts a valid full configuration", async () => {
    process.env = {
      NODE_ENV: "test",
      SESSION_COOKIE_SECRET: "a".repeat(32),
      SUPABASE_URL: "http://127.0.0.1:54321",
    };
    const mod = await import("./env");
    expect(mod.serverEnv.SUPABASE_URL).toBe("http://127.0.0.1:54321");
  });
});
