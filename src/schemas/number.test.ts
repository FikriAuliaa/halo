import { describe, expect, it } from "vitest";
import {
  adminAddNumbersSchema,
  adminListNumbersQuerySchema,
  adminUpdateNumberSchema,
  getAvailableNumbersQuerySchema,
} from "./number";

describe("adminAddNumbersSchema", () => {
  it("accepts a single number", () => {
    expect(adminAddNumbersSchema.safeParse({ numbers: ["081234567890"] }).success).toBe(true);
  });

  it("rejects an empty list", () => {
    expect(adminAddNumbersSchema.safeParse({ numbers: [] }).success).toBe(false);
  });

  it("rejects more than 200 numbers (boundary)", () => {
    const numbers = Array.from({ length: 201 }, (_, i) => `0812345${String(i).padStart(5, "0")}`);
    expect(adminAddNumbersSchema.safeParse({ numbers }).success).toBe(false);
  });

  it("accepts exactly 200 numbers (boundary)", () => {
    const numbers = Array.from({ length: 200 }, (_, i) => `0812345${String(i).padStart(5, "0")}`);
    expect(adminAddNumbersSchema.safeParse({ numbers }).success).toBe(true);
  });
});

describe("adminListNumbersQuerySchema", () => {
  it("defaults limit to 25 and accepts no filters", () => {
    const result = adminListNumbersQuerySchema.safeParse({});
    expect(result.success && result.data.limit).toBe(25);
  });

  it("rejects an invalid status", () => {
    expect(adminListNumbersQuerySchema.safeParse({ status: "bogus" }).success).toBe(false);
  });
});

describe("adminUpdateNumberSchema", () => {
  it("requires a reason", () => {
    expect(adminUpdateNumberSchema.safeParse({}).success).toBe(false);
    expect(adminUpdateNumberSchema.safeParse({ reason: "Perbaikan typo" }).success).toBe(true);
  });
});

describe("getAvailableNumbersQuerySchema", () => {
  it("defaults limit to 12", () => {
    const result = getAvailableNumbersQuerySchema.safeParse({});
    expect(result.success && result.data.limit).toBe(12);
  });

  it("rejects a limit above 50", () => {
    expect(getAvailableNumbersQuerySchema.safeParse({ limit: "51" }).success).toBe(false);
  });

  it("rejects a non-numeric suffix", () => {
    expect(getAvailableNumbersQuerySchema.safeParse({ suffix: "abcd" }).success).toBe(false);
  });

  it("accepts a valid numeric suffix", () => {
    expect(getAvailableNumbersQuerySchema.safeParse({ suffix: "5678" }).success).toBe(true);
  });

  // Real, live bug (found by a user clicking "Refresh" until enough
  // numbers were shown to need excluding more than one): a query
  // string with a single `exclude=...` param and `createHandler`'s
  // `parseQueryParams` never producing a real array for it — a bare
  // string was never a valid `z.array`, so even the *first* refresh
  // click failed, not just later ones with multiple values.
  it("normalizes a single exclude value (as the wire format actually delivers it) into a one-element array", () => {
    const result = getAvailableNumbersQuerySchema.safeParse({ exclude: "081125166423" });
    expect(result.success && result.data.exclude).toEqual(["081125166423"]);
  });

  it("accepts multiple exclude values already as an array", () => {
    const result = getAvailableNumbersQuerySchema.safeParse({
      exclude: ["081125166423", "081125178974"],
    });
    expect(result.success && result.data.exclude).toEqual(["081125166423", "081125178974"]);
  });

  it("leaves exclude undefined when absent", () => {
    const result = getAvailableNumbersQuerySchema.safeParse({});
    expect(result.success && result.data.exclude).toBeUndefined();
  });
});
