import { describe, expect, it } from "vitest";
import { AppError } from "./errors";
import {
  formatCurrencyIDR,
  formatDateTimeJakarta,
  formatNumberGrouped,
  formatPhoneForDisplay,
  normalizePhone,
} from "./format";

describe("normalizePhone", () => {
  it.each([
    ["081234567890", "+6281234567890"],
    ["0812-3456-7890", "+6281234567890"],
    ["0812 3456 7890", "+6281234567890"],
    ["+6281234567890", "+6281234567890"],
    ["6281234567890", "+6281234567890"],
    // Bare national significant number, no leading 0 or 62 — what
    // `PhoneField` actually produces, since its fixed "+62" prefix means
    // the user types straight into the part after it (found live: typing
    // exactly this into the real form was rejected before this fix).
    ["81234567890", "+6281234567890"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it("rejects a number that doesn't start with 08 or +62/62", () => {
    expect(() => normalizePhone("1234567890")).toThrow(AppError);
  });

  it("rejects a number shorter than the 10-digit minimum", () => {
    expect(() => normalizePhone("08123")).toThrow(AppError);
  });

  it("rejects a number longer than the 13-digit maximum", () => {
    expect(() => normalizePhone("081234567890123")).toThrow(AppError);
  });

  it("throws a VALIDATION_FAILED AppError naming the whatsapp field", () => {
    try {
      normalizePhone("not-a-phone");
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).code).toBe("VALIDATION_FAILED");
      expect((e as AppError).field).toBe("whatsapp");
    }
  });
});

describe("formatPhoneForDisplay", () => {
  it("converts E.164 back to the 08... display form", () => {
    expect(formatPhoneForDisplay("+6281234567890")).toBe("081234567890");
  });

  it("passes through a non-+62 value unchanged (defensive, should not occur)", () => {
    expect(formatPhoneForDisplay("081234567890")).toBe("081234567890");
  });
});

describe("formatCurrencyIDR", () => {
  it("formats a whole-rupiah amount with no decimals", () => {
    expect(formatCurrencyIDR(100_000)).toMatch(/Rp\s*100\.000/);
  });

  it("formats zero", () => {
    expect(formatCurrencyIDR(0)).toMatch(/Rp\s*0/);
  });
});

describe("formatDateTimeJakarta", () => {
  it("renders a stable, non-empty string for a fixed date", () => {
    const result = formatDateTimeJakarta(new Date("2026-08-20T00:00:00Z"));
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("formatNumberGrouped", () => {
  it("groups a 12-digit number into 4-digit blocks", () => {
    expect(formatNumberGrouped("081125154044")).toBe("0811 - 2515 - 4044");
  });

  it("handles a length not evenly divisible by 4", () => {
    expect(formatNumberGrouped("12345")).toBe("1234 - 5");
  });
});
