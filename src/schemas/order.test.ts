import { describe, expect, it } from "vitest";
import {
  adminListOrdersQuerySchema,
  adminRejectPaymentSchema,
  adminVerifyPaymentSchema,
  orderFormSchema,
  submitOrderSchema,
  trackingLookupSchema,
} from "./order";

const VALID_ORDER_FORM = {
  full_name: "Budi Santoso",
  university: "Universitas Airlangga",
  whatsapp: "081234567890",
  email: "budi@example.com",
  package_id: "pkg_160gb",
};

describe("orderFormSchema", () => {
  it("accepts a fully valid submission", () => {
    const result = orderFormSchema.safeParse(VALID_ORDER_FORM);
    expect(result.success).toBe(true);
  });

  it("normalises the phone number as part of validation", () => {
    const result = orderFormSchema.safeParse(VALID_ORDER_FORM);
    expect(result.success && result.data.whatsapp).toBe("+6281234567890");
  });

  it("rejects a missing university", () => {
    const result = orderFormSchema.safeParse({ ...VALID_ORDER_FORM, university: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid package_id", () => {
    const result = orderFormSchema.safeParse({ ...VALID_ORDER_FORM, package_id: "invalid" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing field entirely", () => {
    const withoutEmail: Partial<typeof VALID_ORDER_FORM> = { ...VALID_ORDER_FORM };
    delete withoutEmail.email;
    const result = orderFormSchema.safeParse(withoutEmail);
    expect(result.success).toBe(false);
  });
});

describe("submitOrderSchema", () => {
  it("requires an idempotency key in addition to the form fields", () => {
    expect(submitOrderSchema.safeParse(VALID_ORDER_FORM).success).toBe(false);
    expect(
      submitOrderSchema.safeParse({ ...VALID_ORDER_FORM, idempotency_key: "key-1" }).success,
    ).toBe(true);
  });
});

describe("trackingLookupSchema", () => {
  it("requires both order_ref and tracking_token", () => {
    expect(
      trackingLookupSchema.safeParse({ order_ref: "HALO-ABCDEFGHJ", tracking_token: "t" }).success,
    ).toBe(true);
    expect(trackingLookupSchema.safeParse({ order_ref: "HALO-ABCDEFGHJ" }).success).toBe(false);
    expect(trackingLookupSchema.safeParse({ tracking_token: "t" }).success).toBe(false);
  });
});

describe("adminRejectPaymentSchema", () => {
  it("requires a non-empty admin_note and an idempotency_key", () => {
    expect(
      adminRejectPaymentSchema.safeParse({
        admin_note: "Bukti tidak sesuai",
        idempotency_key: "a-key",
      }).success,
    ).toBe(true);
    expect(
      adminRejectPaymentSchema.safeParse({ admin_note: "", idempotency_key: "a-key" }).success,
    ).toBe(false);
    expect(adminRejectPaymentSchema.safeParse({ admin_note: "Bukti tidak sesuai" }).success).toBe(
      false,
    );
    expect(adminRejectPaymentSchema.safeParse({}).success).toBe(false);
  });
});

describe("adminVerifyPaymentSchema", () => {
  it("admin_note is optional, but idempotency_key is mandatory", () => {
    expect(adminVerifyPaymentSchema.safeParse({ idempotency_key: "a-key" }).success).toBe(true);
    expect(adminVerifyPaymentSchema.safeParse({}).success).toBe(false);
  });
});

describe("adminListOrdersQuerySchema", () => {
  it("defaults limit to 25", () => {
    const result = adminListOrdersQuerySchema.safeParse({});
    expect(result.success && result.data.limit).toBe(25);
  });

  it("rejects a limit above 100", () => {
    expect(adminListOrdersQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
  });

  it("rejects an invalid status value", () => {
    expect(adminListOrdersQuerySchema.safeParse({ status: "not-a-status" }).success).toBe(false);
  });
});
