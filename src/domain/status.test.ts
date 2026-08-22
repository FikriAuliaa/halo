import { describe, expect, it } from "vitest";
import {
  NUMBER_STATUSES,
  NUMBER_STATUS_LABELS,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
} from "./status";

describe("status labels", () => {
  it("every number status has a distinct label", () => {
    const labels = NUMBER_STATUSES.map((s) => NUMBER_STATUS_LABELS[s]);
    expect(labels).toHaveLength(NUMBER_STATUSES.length);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("every order status has a distinct label", () => {
    const labels = ORDER_STATUSES.map((s) => ORDER_STATUS_LABELS[s]);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("has exactly the five statuses from ADR-003", () => {
    expect(NUMBER_STATUSES).toEqual(["available", "reserved", "pending", "sold", "sold_offline"]);
  });

  it("has exactly the three order statuses from the spec", () => {
    expect(ORDER_STATUSES).toEqual(["pending", "verified", "rejected"]);
  });
});
