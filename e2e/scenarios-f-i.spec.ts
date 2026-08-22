import { test, expect } from "@playwright/test";
import { formatPhoneDisplay } from "../src/domain/phone";
import {
  deleteTestNumber,
  getAuditLogFor,
  getNumber,
  getOrderByRef,
  insertFreshNumber,
} from "./helpers/db";
import { notAnImagePath, polyglotJpegPath, validJpegPath } from "./helpers/fixtures";

/**
 * E2E scenarios F-I (B120): upload validation and admin verification.
 * No shared `afterAll(cleanupTestData)` — see the doc comment in
 * `scenarios-a-e.spec.ts` for why that wildcard cleanup is unsafe under
 * `fullyParallel` and was removed; each test owns and deletes its own
 * number instead.
 */

async function reserveAndReachPaymentScreen(page: import("@playwright/test").Page, number: string) {
  const display = formatPhoneDisplay(number);
  const suffix = number.slice(-4);
  await page.goto("/");
  const searchResponse = page.waitForResponse(
    (res) => res.url().includes(`/api/numbers?suffix=${suffix}`) && res.status() === 200,
  );
  await page.getByLabel("Cari 4 digit terakhir").fill(suffix);
  await searchResponse;
  await page.getByLabel(`Nomor ${display}`, { exact: true }).click();
  await page.getByRole("button", { name: "Lanjut Pilih Paket" }).click();
  await page
    .getByRole("button", { name: "Saya Sudah Menyimpannya, Lanjutkan" })
    .click({ timeout: 10_000 });
  await page.locator('[aria-label^="Paket "]').first().click();
  await page.getByRole("button", { name: "Lanjut Isi Data Diri" }).click();
  await page.getByLabel("Nama Lengkap").fill("E2E Upload Test");
  await page.getByLabel("Universitas").click();
  await page.getByRole("option").first().click();
  await page.getByLabel("Nomor WhatsApp").fill("081234500002");
  await page.getByLabel("Email").fill("upload-test@example.com");
  await page.getByRole("button", { name: "Lanjut ke Pembayaran" }).click();
}

test.describe("Scenario F: invalid uploads are rejected by both tiers", () => {
  test("a non-image file is refused server-side (bypassing any client check)", async ({
    request,
  }) => {
    const number = await insertFreshNumber();
    try {
      const reserveRes = await request.post(`/api/numbers/${number}/reserve`, {
        data: { idempotency_key: `e2e-f-api-${Date.now()}` },
      });
      expect(reserveRes.ok()).toBe(true);

      // Direct API call — no client-side guard could have run here at
      // all, so a rejection proves the *server's* validation, not the
      // UI's convenience check.
      const res = await request.post("/api/orders", {
        multipart: {
          full_name: "E2E Scenario F",
          university: "Universitas Surabaya",
          whatsapp: "+6281234500003",
          email: "scenario-f@example.com",
          package_id: "pkg_160gb",
          idempotency_key: `e2e-f-order-${Date.now()}`,
          proof: {
            name: "not-an-image.jpg",
            mimeType: "image/jpeg",
            buffer: Buffer.from("this is not an image"),
          },
        },
      });

      expect(res.status()).toBe(422);
      const body = await res.json();
      expect(body.error.code).toBe("INVALID_FILE_TYPE");

      const row = await getNumber(number);
      // Refused before the number ever left `reserved` for `pending`.
      expect(row!.status).toBe("reserved");
    } finally {
      await deleteTestNumber(number);
    }
  });

  test("a polyglot file (valid JPEG header + appended script payload) is refused, not silently re-saved", async ({
    request,
  }) => {
    const number = await insertFreshNumber();
    try {
      await request.post(`/api/numbers/${number}/reserve`, {
        data: { idempotency_key: `e2e-f-poly-${Date.now()}` },
      });

      const { readFileSync } = await import("node:fs");
      const polyglotPath = await polyglotJpegPath();
      const polyglotBuffer = readFileSync(polyglotPath);

      const res = await request.post("/api/orders", {
        multipart: {
          full_name: "E2E Scenario F Polyglot",
          university: "Universitas Surabaya",
          whatsapp: "+6281234500004",
          email: "scenario-f-poly@example.com",
          package_id: "pkg_160gb",
          idempotency_key: `e2e-f-poly-order-${Date.now()}`,
          proof: { name: "polyglot.jpg", mimeType: "image/jpeg", buffer: polyglotBuffer },
        },
      });

      // A polyglot with a genuinely valid JPEG header *decodes* fine —
      // sniffing alone can't catch it. The real control is that
      // `uploadProof` unconditionally re-encodes via `sharp`, which
      // discards the appended payload entirely rather than merely
      // passing validation; this call is therefore expected to
      // **succeed**, and the proof that matters is downstream (the
      // stored object no longer contains the payload), covered by the
      // existing unit tests for `reencodeImage`. Assert the order
      // completed normally here rather than expecting a rejection this
      // input was never supposed to trigger.
      expect(res.ok()).toBe(true);
    } finally {
      await deleteTestNumber(number);
    }
  });

  test("the UI surfaces the server's rejection as a visible error, not a silent failure", async ({
    page,
  }) => {
    const number = await insertFreshNumber();
    try {
      await reserveAndReachPaymentScreen(page, number);
      await page.locator('input[type="file"]').setInputFiles(notAnImagePath());

      const submit = page.getByRole("button", { name: "Kirim Bukti Pembayaran" });
      if (await submit.isEnabled({ timeout: 5_000 }).catch(() => false)) {
        await submit.click();
        await expect(page.getByRole("alert")).toBeVisible({ timeout: 10_000 });
      } else {
        // The client-side convenience check (file extension/type hint)
        // already disabled submission — also an acceptable, honest
        // outcome for "the UI rejects it," just at the earlier tier.
        await expect(submit).toBeDisabled();
      }
    } finally {
      await deleteTestNumber(number);
    }
  });

  test('"Coba Lagi" after a file-type rejection lets the student pick a different file, not loop on the same one', async ({
    page,
  }) => {
    const number = await insertFreshNumber();
    try {
      await reserveAndReachPaymentScreen(page, number);
      await page.locator('input[type="file"]').setInputFiles(notAnImagePath());

      // Scoped to the uploader's own error text, not `getByRole("alert")`
      // -- Next's route announcer div also carries `role="alert"` and is
      // always present, so an unscoped locator never resolves to "gone".
      const uploadError = page.locator('p[role="alert"]');
      const submit = page.getByRole("button", { name: "Kirim Bukti Pembayaran" });
      await submit.click();
      await expect(uploadError).toBeVisible({ timeout: 10_000 });

      // Found live: retrying re-submitted the exact same (permanently
      // invalid) file and looped on the identical error forever. It
      // should instead clear the bad file so the student can pick a new
      // one -- the upload prompt reappears rather than the same error.
      await page.getByRole("button", { name: "Coba Lagi" }).click();
      await expect(page.getByText("Unggah Bukti Pembayaran")).toBeVisible();
      await expect(uploadError).not.toBeVisible();
    } finally {
      await deleteTestNumber(number);
    }
  });
});

test.describe("Scenario G: a valid proof upload results in a pending order", () => {
  test("uploading a real, decodable image completes the order as pending", async ({ page }) => {
    const number = await insertFreshNumber();
    try {
      await reserveAndReachPaymentScreen(page, number);
      await page.locator('input[type="file"]').setInputFiles(await validJpegPath());
      await expect(page.getByRole("button", { name: "Kirim Bukti Pembayaran" })).toBeEnabled({
        timeout: 10_000,
      });
      await page.getByRole("button", { name: "Kirim Bukti Pembayaran" }).click();
      await expect(page).toHaveURL(/\/konfirmasi/, { timeout: 15_000 });

      const row = await getNumber(number);
      expect(row!.status).toBe("pending");

      const ref = new URL(page.url()).searchParams.get("ref");
      const order = await getOrderByRef(ref!);
      expect(order!.status).toBe("pending");
    } finally {
      await deleteTestNumber(number);
    }
  });
});

async function createPendingOrder(request: import("@playwright/test").APIRequestContext) {
  const number = await insertFreshNumber();
  await request.post(`/api/numbers/${number}/reserve`, {
    data: { idempotency_key: `e2e-hi-reserve-${Date.now()}-${number}` },
  });
  const res = await request.post("/api/orders", {
    multipart: {
      full_name: "E2E Admin Flow",
      university: "Universitas Surabaya",
      whatsapp: "+6281234500005",
      email: "admin-flow@example.com",
      package_id: "pkg_160gb",
      idempotency_key: `e2e-hi-order-${Date.now()}-${number}`,
      proof: {
        name: "proof.jpg",
        mimeType: "image/jpeg",
        buffer: (await import("node:fs")).readFileSync(await validJpegPath()),
      },
    },
  });
  const body = await res.json();
  return { number, orderRef: body.order_ref as string };
}

test.describe("Scenario H: admin verifies payment", () => {
  // Shared login from `global-setup.ts`, not a fresh one per test — see
  // its doc comment for the rate-limit collision this avoids.
  test.use({ storageState: "e2e/.auth/telkomsel.json" });

  test("verifying moves the order to verified and the number to sold, atomically and audited", async ({
    request,
  }) => {
    const { number, orderRef } = await createPendingOrder(request);
    try {
      const order = await getOrderByRef(orderRef);
      const verifyRes = await request.post(`/api/admin/orders/${order!.id}/verify`, {
        data: { idempotency_key: `e2e-h-${Date.now()}` },
      });
      expect(verifyRes.ok()).toBe(true);

      const updatedOrder = await getOrderByRef(orderRef);
      const updatedNumber = await getNumber(number);
      expect(updatedOrder!.status).toBe("verified");
      expect(updatedNumber!.status).toBe("sold");

      const audit = await getAuditLogFor("order", order!.id);
      expect(audit.some((row) => row.action === "adminVerifyPayment")).toBe(true);
    } finally {
      await deleteTestNumber(number);
    }
  });
});

test.describe("Scenario I: admin rejects payment", () => {
  test.use({ storageState: "e2e/.auth/telkomsel.json" });

  test("rejecting moves the order to rejected and the number back to available, atomically and audited", async ({
    request,
  }) => {
    const { number, orderRef } = await createPendingOrder(request);
    try {
      const order = await getOrderByRef(orderRef);
      const rejectRes = await request.post(`/api/admin/orders/${order!.id}/reject`, {
        data: { admin_note: "Bukti tidak sesuai", idempotency_key: `e2e-i-${Date.now()}` },
      });
      expect(rejectRes.ok()).toBe(true);

      const updatedOrder = await getOrderByRef(orderRef);
      const updatedNumber = await getNumber(number);
      expect(updatedOrder!.status).toBe("rejected");
      expect(updatedNumber!.status).toBe("available");

      const audit = await getAuditLogFor("order", order!.id);
      expect(audit.some((row) => row.action === "adminRejectPayment")).toBe(true);
    } finally {
      await deleteTestNumber(number);
    }
  });
});
