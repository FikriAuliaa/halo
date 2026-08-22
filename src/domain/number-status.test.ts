import { describe, expect, it } from "vitest";
import { NUMBER_STATUSES } from "./status";
import {
  assertTransition,
  canTransition,
  fullTransitionMatrix,
  getAvailableActions,
  getEffectiveStatus,
  type NumberActor,
} from "./number-status";
import { AppError } from "@/lib/errors";

const ALL_ACTORS: NumberActor[] = ["system", "student", "ADMIN_KAMPUS", "ADMIN_TELKOMSEL"];

// The exact ADR-003 table, expressed as the one true expectation this test
// checks every one of the 5x5 = 25 pairs against, for every actor.
const EXPECTED_LEGAL: Record<string, NumberActor[]> = {
  "available>reserved": ["student"],
  "reserved>pending": ["student"],
  "reserved>available": ["system", "student"],
  "pending>sold": ["ADMIN_KAMPUS", "ADMIN_TELKOMSEL"],
  "pending>available": ["ADMIN_KAMPUS", "ADMIN_TELKOMSEL"],
  "available>sold_offline": ["ADMIN_TELKOMSEL"],
};

describe("canTransition — exhaustive over all 25 (from, to) pairs", () => {
  for (const from of NUMBER_STATUSES) {
    for (const to of NUMBER_STATUSES) {
      const key = `${from}>${to}`;
      const expectedActors = EXPECTED_LEGAL[key] ?? [];

      it(`${from} -> ${to}`, () => {
        for (const actor of ALL_ACTORS) {
          const expected = expectedActors.includes(actor);
          expect(canTransition(from, to, actor)).toBe(expected);
        }
      });
    }
  }

  it("same-state pairs are always illegal for every actor (not a real transition)", () => {
    for (const status of NUMBER_STATUSES) {
      for (const actor of ALL_ACTORS) {
        expect(canTransition(status, status, actor)).toBe(false);
      }
    }
  });

  it("sold and sold_offline have no legal standard-operation transitions out, for any actor", () => {
    for (const from of ["sold", "sold_offline"] as const) {
      for (const to of NUMBER_STATUSES) {
        for (const actor of ALL_ACTORS) {
          expect(canTransition(from, to, actor)).toBe(false);
        }
      }
    }
  });
});

describe("assertTransition", () => {
  it("does not throw for a legal transition", () => {
    expect(() => assertTransition("available", "reserved", "student")).not.toThrow();
  });

  it("throws a CONFLICT AppError for an illegal transition", () => {
    try {
      assertTransition("sold", "available", "ADMIN_TELKOMSEL");
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).code).toBe("CONFLICT");
    }
  });

  it("throws for pending -> sold_offline even for ADMIN_TELKOMSEL (a number under review is never offline-eligible)", () => {
    expect(() => assertTransition("pending", "sold_offline", "ADMIN_TELKOMSEL")).toThrow(AppError);
  });
});

describe("getAvailableActions", () => {
  it("a student can only move an available number to reserved", () => {
    expect(getAvailableActions("available", "student")).toEqual(["reserved"]);
  });

  it("ADMIN_KAMPUS cannot mark a number sold offline", () => {
    expect(getAvailableActions("available", "ADMIN_KAMPUS")).toEqual([]);
  });

  it("ADMIN_TELKOMSEL can mark an available number sold offline", () => {
    expect(getAvailableActions("available", "ADMIN_TELKOMSEL")).toEqual(["sold_offline"]);
  });

  it("either admin role can verify or reject a pending order's number", () => {
    expect(getAvailableActions("pending", "ADMIN_KAMPUS").sort()).toEqual(["available", "sold"]);
    expect(getAvailableActions("pending", "ADMIN_TELKOMSEL").sort()).toEqual(["available", "sold"]);
  });

  it("no actor has any available action from a terminal state", () => {
    for (const actor of ALL_ACTORS) {
      expect(getAvailableActions("sold", actor)).toEqual([]);
      expect(getAvailableActions("sold_offline", actor)).toEqual([]);
    }
  });
});

describe("getEffectiveStatus — lazy expiry", () => {
  const now = new Date("2026-08-20T10:00:00.000Z");

  it("returns the stored status when not reserved", () => {
    expect(getEffectiveStatus({ status: "available", reserved_until: null }, now)).toBe(
      "available",
    );
  });

  it("returns 'reserved' when reserved_until is still in the future", () => {
    const future = new Date("2026-08-20T10:05:00.000Z");
    expect(getEffectiveStatus({ status: "reserved", reserved_until: future }, now)).toBe(
      "reserved",
    );
  });

  it("returns 'available' when reserved_until is in the past", () => {
    const past = new Date("2026-08-20T09:55:00.000Z");
    expect(getEffectiveStatus({ status: "reserved", reserved_until: past }, now)).toBe("available");
  });

  it("treats exactly reserved_until === now as expired (boundary, <=)", () => {
    expect(getEffectiveStatus({ status: "reserved", reserved_until: now }, now)).toBe("available");
  });

  it("treats one millisecond before reserved_until as still reserved (boundary)", () => {
    const almostNow = new Date(now.getTime() - 1);
    expect(getEffectiveStatus({ status: "reserved", reserved_until: now }, almostNow)).toBe(
      "reserved",
    );
  });

  it("never applies lazy expiry to non-reserved statuses", () => {
    const past = new Date("2020-01-01T00:00:00.000Z");
    expect(getEffectiveStatus({ status: "pending", reserved_until: past }, now)).toBe("pending");
  });
});

describe("fullTransitionMatrix", () => {
  it("has exactly 25 entries (5x5)", () => {
    expect(fullTransitionMatrix()).toHaveLength(25);
  });

  it("matches canTransition for a sample of entries", () => {
    const matrix = fullTransitionMatrix();
    const entry = matrix.find((e) => e.from === "available" && e.to === "reserved")!;
    expect(entry.legalFor).toEqual(["student"]);
  });
});
