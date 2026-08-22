import { describe, expect, it } from "vitest";
import {
  formatPhoneCompact,
  formatPhoneDisplay,
  isValidIndonesianMobile,
  normalizePhone,
} from "./phone";

describe("normalizePhone — accepted shapes, all normalise to the same canonical value", () => {
  const expected = "081125154044";

  it.each([
    ["081125154044", expected],
    ["0811-2515-4044", expected],
    ["0811 2515 4044", expected],
    ["(0811) 2515-4044", expected],
    ["+6281125154044", expected],
    ["+62 811-2515-4044", expected],
    ["6281125154044", expected],
    ["62 811 2515 4044", expected],
    ["081125154044 ", expected], // trailing non-breaking space
    [" 081125154044", expected], // leading non-breaking space
    ["0811 2515 4044", expected], // NBSP as a separator
  ])("normalises %s", (input, want) => {
    const result = normalizePhone(input);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(want);
  });
});

describe("normalizePhone — rejected shapes, each with a specific reason", () => {
  it.each([
    ["", "empty"],
    ["   ", "whitespace only"],
    ["1234567890", "wrong prefix (no 08/62/+62)"],
    ["9811125154044", "wrong prefix"],
    ["0812345", "too short"],
    ["08123456789012345", "too long"],
    ["0811-ABCD-4044", "contains letters"],
    ["+1 811 2515 4044", "wrong country code"],
    ["++6281125154044", "malformed plus prefix"],
    ["08112515404X", "trailing letter"],
  ])("rejects %s (%s)", (input) => {
    const result = normalizePhone(input);
    expect(result.ok).toBe(false);
    expect(result.value).toBeNull();
    expect(result.reason).toBeTruthy();
  });

  it("rejects exactly 9 digits (below the 10-digit minimum, boundary)", () => {
    expect(normalizePhone("081234567").ok).toBe(false);
  });

  it("accepts exactly 10 digits (boundary)", () => {
    expect(normalizePhone("0812345678").ok).toBe(true);
  });

  it("accepts exactly 13 digits (boundary)", () => {
    expect(normalizePhone("0812345678901").ok).toBe(true);
  });

  it("rejects exactly 14 digits (above the 13-digit maximum, boundary)", () => {
    expect(normalizePhone("08123456789012").ok).toBe(false);
  });
});

describe("normalizePhone — every accepted shape produces an identical result", () => {
  it("081125154044, 0811-2515-4044, +6281125154044, and 6281125154044 are all equal after normalisation", () => {
    const shapes = ["081125154044", "0811-2515-4044", "+6281125154044", "6281125154044"];
    const results = shapes.map((s) => normalizePhone(s).value);
    expect(new Set(results).size).toBe(1);
  });
});

describe("isValidIndonesianMobile", () => {
  it("returns true for a valid number", () => {
    expect(isValidIndonesianMobile("081125154044")).toBe(true);
  });

  it("returns false for an invalid number", () => {
    expect(isValidIndonesianMobile("123")).toBe(false);
  });
});

describe("formatPhoneDisplay", () => {
  it("groups a 12-digit canonical number into 4-digit blocks", () => {
    expect(formatPhoneDisplay("081125154044")).toBe("0811 - 2515 - 4044");
  });

  it("matches the reference's exact grouping for the sample number", () => {
    expect(formatPhoneDisplay("081112345678")).toBe("0811 - 1234 - 5678");
  });
});

describe("formatPhoneCompact", () => {
  it("returns the canonical value unchanged", () => {
    expect(formatPhoneCompact("081125154044")).toBe("081125154044");
  });
});
