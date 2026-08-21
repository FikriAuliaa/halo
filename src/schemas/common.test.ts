import { describe, expect, it } from "vitest";
import {
  emailSchema,
  fullNameSchema,
  numberIdSchema,
  orderRefSchema,
  packageIdSchema,
  phoneSchema,
  trackingTokenSchema,
} from "./common";

describe("phoneSchema", () => {
  it.each([
    ["081234567890", "+6281234567890"],
    ["0812-3456-7890", "+6281234567890"],
    ["0812 3456 7890", "+6281234567890"],
    ["+6281234567890", "+6281234567890"],
    ["6281234567890", "+6281234567890"],
    ["81234567890", "+6281234567890"],
  ])("accepts and normalises %s", (input, expected) => {
    const result = phoneSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(expected);
  });

  it("rejects an empty value with an Indonesian message", () => {
    const result = phoneSchema.safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe("Nomor WhatsApp wajib diisi");
  });

  it("rejects a number that doesn't start with 08/62/+62", () => {
    const result = phoneSchema.safeParse("1234567890");
    expect(result.success).toBe(false);
  });

  it("rejects a too-short number", () => {
    expect(phoneSchema.safeParse("08123").success).toBe(false);
  });
});

describe("emailSchema", () => {
  it("accepts a valid email", () => {
    expect(emailSchema.safeParse("budi@example.com").success).toBe(true);
  });

  it("rejects a malformed email with an Indonesian message", () => {
    const result = emailSchema.safeParse("not-an-email");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe("Format email tidak valid");
  });

  it("rejects an empty value", () => {
    expect(emailSchema.safeParse("").success).toBe(false);
  });
});

describe("fullNameSchema", () => {
  it("accepts a name within 2-100 chars", () => {
    expect(fullNameSchema.safeParse("Budi Santoso").success).toBe(true);
  });

  it("trims surrounding whitespace", () => {
    const result = fullNameSchema.safeParse("  Budi  ");
    expect(result.success && result.data).toBe("Budi");
  });

  it("rejects a single-character name (boundary)", () => {
    expect(fullNameSchema.safeParse("A").success).toBe(false);
  });

  it("accepts exactly 2 characters (boundary)", () => {
    expect(fullNameSchema.safeParse("Al").success).toBe(true);
  });

  it("rejects a name longer than 100 characters", () => {
    expect(fullNameSchema.safeParse("a".repeat(101)).success).toBe(false);
  });

  it("accepts exactly 100 characters (boundary)", () => {
    expect(fullNameSchema.safeParse("a".repeat(100)).success).toBe(true);
  });
});

describe("orderRefSchema", () => {
  it("accepts a well-formed order ref", () => {
    expect(orderRefSchema.safeParse("HALO-ABCDEFGHJ").success).toBe(true);
  });

  it("rejects a ref with an excluded ambiguous character", () => {
    expect(orderRefSchema.safeParse("HALO-ABCDEFGHI").success).toBe(false);
  });

  it("rejects a ref with the wrong length", () => {
    expect(orderRefSchema.safeParse("HALO-ABC").success).toBe(false);
  });
});

describe("trackingTokenSchema", () => {
  it("rejects an empty token", () => {
    expect(trackingTokenSchema.safeParse("").success).toBe(false);
  });

  it("accepts a non-empty token", () => {
    expect(trackingTokenSchema.safeParse("some-token-value").success).toBe(true);
  });
});

describe("numberIdSchema", () => {
  it.each(["081125154044", "0812345678", "0812345678901"])("accepts %s", (value) => {
    expect(numberIdSchema.safeParse(value).success).toBe(true);
  });

  it.each(["1234567890", "0812345", "081234567890123456"])("rejects %s", (value) => {
    expect(numberIdSchema.safeParse(value).success).toBe(false);
  });
});

describe("packageIdSchema", () => {
  it.each(["pkg_70gb", "pkg_120gb", "pkg_160gb", "pkg_220gb", "pkg_300gb"])(
    "accepts %s",
    (value) => {
      expect(packageIdSchema.safeParse(value).success).toBe(true);
    },
  );

  it("rejects an arbitrary string", () => {
    expect(packageIdSchema.safeParse("70gb").success).toBe(false);
  });
});
