import { describe, expect, it } from "vitest";
import { adminMarkSoldOfflineSchema, adminRoleSchema } from "./admin";

describe("adminMarkSoldOfflineSchema", () => {
  it("accepts a bulk list of numbers", () => {
    expect(
      adminMarkSoldOfflineSchema.safeParse({ numbers: ["081234567890", "081234567891"] }).success,
    ).toBe(true);
  });

  it("rejects an empty list", () => {
    expect(adminMarkSoldOfflineSchema.safeParse({ numbers: [] }).success).toBe(false);
  });

  it("rejects a malformed number in the list", () => {
    expect(adminMarkSoldOfflineSchema.safeParse({ numbers: ["not-a-number"] }).success).toBe(false);
  });
});

describe("adminRoleSchema", () => {
  it.each(["ADMIN_KAMPUS", "ADMIN_TELKOMSEL"])("accepts %s", (role) => {
    expect(adminRoleSchema.safeParse(role).success).toBe(true);
  });

  it("rejects an arbitrary role string", () => {
    expect(adminRoleSchema.safeParse("SUPERADMIN").success).toBe(false);
  });
});
