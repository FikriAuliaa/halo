import { test, expect } from "@playwright/test";
import postgres from "postgres";
import { insertFreshNumber, deleteTestNumber } from "./helpers/db";

/**
 * Failure-mode tests (B124) — a genuinely achievable subset of the full
 * matrix (Part G), not all of it. Several rows (Postgres/Storage
 * unavailable, the scheduled cron job failing, a server restart
 * mid-reservation, a network interruption mid-upload) would require
 * actually taking down the local Supabase stack's containers or
 * injecting network faults mid-request — infrastructure this pass
 * didn't build, and simulating them by stubbing the repository instead
 * would prove nothing about real behavior (the exact failure mode B124
 * itself warns against). Documented as deferred, not silently skipped —
 * see the Phase 15 gate report.
 *
 * A fourth case — a deleted `system` config row — was **verified
 * manually** rather than automated here (delete the row, confirm
 * `reserveNumber` degrades to a clean `500 INTERNAL` with a safe
 * message rather than a raw crash, confirm the number is never
 * half-reserved, restore the row): that config row is shared, cached
 * (30s TTL) global state every other reservation-touching test in this
 * suite depends on, so temporarily deleting it under `fullyParallel`
 * risks spuriously failing unrelated concurrent tests — the same class
 * of collision `cleanupTestData`'s wildcard delete caused (see
 * `scenarios-a-e.spec.ts`). Automating it safely would need its own
 * fully isolated project/run, judged not worth the added complexity for
 * one already-verified case.
 *
 * What *is* automated here: a missing package reference, a missing
 * university, and a malformed tracking request — none touch shared
 * global state, so they're safe under full parallelism.
 */

const sql = postgres(
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:54322/postgres",
);

test.describe("failure modes", () => {
  test("submitting an order against a nonexistent package is refused cleanly", async ({
    request,
  }) => {
    const number = await insertFreshNumber();
    try {
      await request.post(`/api/numbers/${number}/reserve`, {
        data: { idempotency_key: `e2e-fm-pkg-${Date.now()}` },
      });
      const res = await request.post("/api/orders", {
        multipart: {
          full_name: "Failure Mode Package",
          university: "Universitas Surabaya",
          whatsapp: "+6281234500010",
          email: "fm-package@example.com",
          package_id: "pkg_does_not_exist",
          idempotency_key: `e2e-fm-pkg-order-${Date.now()}`,
          proof: { name: "p.jpg", mimeType: "image/jpeg", buffer: Buffer.from([0xff, 0xd8, 0xff]) },
        },
      });
      expect(res.status()).toBeGreaterThanOrEqual(400);
      expect(res.status()).toBeLessThan(500);
      const body = await res.json();
      expect(body.error?.code).toBeTruthy();

      const [row] = await sql`select status from numbers where number = ${number}`;
      // Refused before the number ever left `reserved` — a malformed
      // request never partially commits.
      expect(row?.status).toBe("reserved");
    } finally {
      await deleteTestNumber(number);
    }
  });

  test("submitting an order against a nonexistent university is refused cleanly", async ({
    request,
  }) => {
    const number = await insertFreshNumber();
    try {
      await request.post(`/api/numbers/${number}/reserve`, {
        data: { idempotency_key: `e2e-fm-uni-${Date.now()}` },
      });
      const res = await request.post("/api/orders", {
        multipart: {
          full_name: "Failure Mode University",
          university: "Universitas Yang Tidak Ada",
          whatsapp: "+6281234500011",
          email: "fm-university@example.com",
          package_id: "pkg_160gb",
          idempotency_key: `e2e-fm-uni-order-${Date.now()}`,
          proof: { name: "p.jpg", mimeType: "image/jpeg", buffer: Buffer.from([0xff, 0xd8, 0xff]) },
        },
      });
      expect(res.status()).toBeGreaterThanOrEqual(400);
      expect(res.status()).toBeLessThan(500);
    } finally {
      await deleteTestNumber(number);
    }
  });

  test("a malformed tracking request is refused cleanly, not a 500", async ({ request }) => {
    const res = await request.post("/api/track", {
      data: { order_ref: "", tracking_token: "" },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});
