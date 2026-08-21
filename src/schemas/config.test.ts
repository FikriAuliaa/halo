import { describe, expect, it } from "vitest";
import {
  adminManagePackagesSchema,
  adminManageUniversitiesSchema,
  adminUpdatePaymentConfigSchema,
  adminUpdateSystemConfigSchema,
} from "./config";

const VALID_PACKAGE = {
  id: "pkg_160gb",
  label: "Halo+ 150K",
  price: 150_000,
  price_status: "draft" as const,
  quota_internet_gb: 160,
  quota_roaming_gb: 2,
  voice_minutes: 400,
  sms_count: 400,
  recommended: true,
  active: true,
  display_order: 3,
};

describe("adminManagePackagesSchema", () => {
  it("accepts a valid package list", () => {
    expect(adminManagePackagesSchema.safeParse({ packages: [VALID_PACKAGE] }).success).toBe(true);
  });

  it("rejects an empty package list", () => {
    expect(adminManagePackagesSchema.safeParse({ packages: [] }).success).toBe(false);
  });

  it("rejects a negative price", () => {
    const invalid = { ...VALID_PACKAGE, price: -1 };
    expect(adminManagePackagesSchema.safeParse({ packages: [invalid] }).success).toBe(false);
  });

  it("rejects zero internet quota", () => {
    const invalid = { ...VALID_PACKAGE, quota_internet_gb: 0 };
    expect(adminManagePackagesSchema.safeParse({ packages: [invalid] }).success).toBe(false);
  });

  it("rejects an invalid price_status", () => {
    const invalid = { ...VALID_PACKAGE, price_status: "final" };
    expect(adminManagePackagesSchema.safeParse({ packages: [invalid] }).success).toBe(false);
  });
});

describe("adminManageUniversitiesSchema", () => {
  it("accepts a valid list", () => {
    expect(
      adminManageUniversitiesSchema.safeParse({
        list: [{ name: "Universitas Airlangga", active: true }],
      }).success,
    ).toBe(true);
  });

  it("rejects an empty list", () => {
    expect(adminManageUniversitiesSchema.safeParse({ list: [] }).success).toBe(false);
  });
});

describe("adminUpdatePaymentConfigSchema", () => {
  it("requires a non-empty payment_label", () => {
    expect(adminUpdatePaymentConfigSchema.safeParse({ payment_label: "" }).success).toBe(false);
    expect(adminUpdatePaymentConfigSchema.safeParse({ payment_label: "QRIS Kampus" }).success).toBe(
      true,
    );
  });
});

describe("adminUpdateSystemConfigSchema", () => {
  it("allows a partial update", () => {
    expect(adminUpdateSystemConfigSchema.safeParse({ reservations_paused: true }).success).toBe(
      true,
    );
  });

  it("allows an empty update", () => {
    expect(adminUpdateSystemConfigSchema.safeParse({}).success).toBe(true);
  });

  it("rejects a non-positive TTL", () => {
    expect(adminUpdateSystemConfigSchema.safeParse({ reservation_ttl_minutes: 0 }).success).toBe(
      false,
    );
  });
});
