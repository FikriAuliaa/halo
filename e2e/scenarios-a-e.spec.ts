import { test, expect } from "@playwright/test";
import { formatPhoneDisplay } from "../src/domain/phone";
import { deleteTestNumber, getNumber, getOrderByRef, insertFreshNumber } from "./helpers/db";
import { validJpegPath } from "./helpers/fixtures";

/**
 * E2E scenarios A-E (B119): the happy path and the reservation lifecycle.
 * Each test seeds its own `0899...`-prefixed number (never colliding with
 * the real seeded `0811...` inventory or another test's number) and tears
 * it down itself in a `finally` block. State is asserted against the
 * database directly (`e2e/helpers/db.ts`), not only the rendered UI, per
 * B119's own constraint that a UI can lie about what actually happened.
 *
 * Deliberately no shared `afterAll(cleanupTestData)` here — found live:
 * `cleanupTestData`'s wildcard delete runs per-*worker*, not once
 * globally, and with `fullyParallel` a fast-finishing spec file's worker
 * could delete a `0899...` number still actively in use by a slower test
 * running concurrently in a different file. Each test owning its own
 * number's lifecycle (insert in the test, delete in its own `finally`)
 * is both correct and sufficient — a leftover from a crashed run is the
 * only case `cleanupTestData` is still for, and that's a manual/CI-only
 * concern, not something every file should run automatically.
 */

async function selectSeededNumber(page: import("@playwright/test").Page, number: string) {
  const display = formatPhoneDisplay(number);
  const suffix = number.slice(-4);
  await page.goto("/");
  // The initial, unfiltered fetch on mount and the debounced, filtered
  // search fetch can resolve out of order in dev mode (first-hit route
  // compilation), so wait for the *specific* filtered response rather
  // than racing the UI's eventual state.
  const searchResponse = page.waitForResponse(
    (res) => res.url().includes(`/api/numbers?suffix=${suffix}`) && res.status() === 200,
  );
  await page.getByLabel("Cari 4 digit terakhir").fill(suffix);
  await searchResponse;
  const card = page.getByLabel(`Nomor ${display}`, { exact: true });
  await expect(card).toBeVisible({ timeout: 10_000 });
  await card.click();
  await page.getByRole("button", { name: "Lanjut Pilih Paket" }).click();

  // A successful reservation shows the tracking token exactly once,
  // in a dialog the student must explicitly dismiss before the app
  // proceeds — the whole point being that it's never retrievable
  // again, so this can't be a passive toast.
  await page
    .getByRole("button", { name: "Saya Sudah Menyimpannya, Lanjutkan" })
    .click({ timeout: 10_000 });
}

test.describe("Scenario A: full happy-path order", () => {
  test("a student selects a number, picks a package, fills data, uploads proof, and reaches confirmation", async ({
    page,
  }) => {
    const number = await insertFreshNumber();
    try {
      await selectSeededNumber(page, number);

      await expect(page).toHaveURL(/\/paket/);
      await page.locator('[aria-label^="Paket "]').first().click();
      await page.getByRole("button", { name: "Lanjut Isi Data Diri" }).click();

      await expect(page).toHaveURL(/\/data/);
      await page.getByLabel("Nama Lengkap").fill("E2E Scenario A");
      await page.getByLabel("Universitas").click();
      await page.getByRole("option").first().click();
      await page.getByLabel("Nomor WhatsApp").fill("081234567890");
      await page.getByLabel("Email").fill("scenario-a@example.com");
      await page.getByRole("button", { name: "Lanjut ke Pembayaran" }).click();

      await expect(page).toHaveURL(/\/bayar/);
      const proof = await validJpegPath();
      await page.locator('input[type="file"]').setInputFiles(proof);
      await expect(page.getByRole("button", { name: "Kirim Bukti Pembayaran" })).toBeEnabled({
        timeout: 10_000,
      });
      await page.getByRole("button", { name: "Kirim Bukti Pembayaran" }).click();

      await expect(page).toHaveURL(/\/konfirmasi/, { timeout: 15_000 });
      await expect(page.getByText("Menunggu Verifikasi")).toBeVisible();
      await expect(page.getByText(formatPhoneDisplay(number))).toBeVisible();

      const url = new URL(page.url());
      const ref = url.searchParams.get("ref");
      expect(ref).toMatch(/^HALO-/);

      const order = await getOrderByRef(ref!);
      expect(order).not.toBeNull();
      expect(order!.status).toBe("pending");
      expect(order!.number).toBe(number);

      const row = await getNumber(number);
      expect(row!.status).toBe("pending");
    } finally {
      await deleteTestNumber(number);
    }
  });
});

test.describe("Scenario B: simultaneous reservation, exactly one winner", () => {
  test("two genuinely independent contexts race the same number", async ({ browser }) => {
    const number = await insertFreshNumber();
    try {
      const contextA = await browser.newContext();
      const contextB = await browser.newContext();

      const [resA, resB] = await Promise.all([
        contextA.request.post(`/api/numbers/${number}/reserve`, {
          data: { idempotency_key: `e2e-b-a-${Date.now()}` },
        }),
        contextB.request.post(`/api/numbers/${number}/reserve`, {
          data: { idempotency_key: `e2e-b-b-${Date.now()}` },
        }),
      ]);

      const statuses = [resA.status(), resB.status()].sort();
      // Exactly one 200, exactly one 409 (NUMBER_UNAVAILABLE) — never
      // both succeeding, never both failing.
      expect(statuses).toEqual([200, 409]);

      const row = await getNumber(number);
      expect(row!.status).toBe("reserved");

      await contextA.close();
      await contextB.close();
    } finally {
      await deleteTestNumber(number);
    }
  });
});

test.describe("Scenario C: reservation expiry returns the number to the pool", () => {
  // `RESERVATION_TTL_MINUTES_OVERRIDE` (see `.env.example`, and the fix
  // in `reserve-number.ts` that actually wires it up — it was declared
  // and schema-validated for this exact purpose but never consulted
  // until this pass) is the smallest granularity available: whole
  // minutes. This test genuinely waits slightly over a minute rather
  // than the real configured TTL (default much longer) — the smallest
  // real wait this override can express, still far better than waiting
  // out a production TTL.
  test.skip(
    !process.env.RESERVATION_TTL_MINUTES_OVERRIDE,
    "requires RESERVATION_TTL_MINUTES_OVERRIDE=1 on the server process",
  );
  test.setTimeout(120_000);

  test("a lapsed reservation is available again without admin/janitor intervention", async ({
    request,
  }) => {
    const number = await insertFreshNumber();
    try {
      const reserveRes = await request.post(`/api/numbers/${number}/reserve`, {
        data: { idempotency_key: `e2e-c-${Date.now()}` },
      });
      expect(reserveRes.ok()).toBe(true);

      const reserved = await getNumber(number);
      expect(reserved!.status).toBe("reserved");

      // Wait past the 1-minute override TTL — lazy expiry (ADR-004)
      // means this doesn't require the janitor to have run.
      await new Promise((resolve) => setTimeout(resolve, 65_000));

      const listRes = await request.get(`/api/numbers?suffix=${number.slice(-4)}`);
      const body = await listRes.json();
      const stillLive = body.numbers.some((n: { number: string }) => n.number === number);
      expect(stillLive).toBe(true);
    } finally {
      await deleteTestNumber(number);
    }
  });
});

test.describe("Scenario D: a refresh preserves an active reservation", () => {
  test("reloading the package page keeps the same reservation and countdown", async ({ page }) => {
    const number = await insertFreshNumber();
    try {
      await selectSeededNumber(page, number);
      await expect(page).toHaveURL(/\/paket/);

      const before = await getNumber(number);
      expect(before!.status).toBe("reserved");
      const reservedUntilBefore = before!.reserved_until;

      await page.reload();
      await expect(page).toHaveURL(/\/paket/);
      // Still on the package screen (the guard didn't bounce us back to
      // `/` for lack of a reservation), and the underlying row is
      // unchanged — a refresh doesn't mint a new reservation.
      const after = await getNumber(number);
      expect(after!.status).toBe("reserved");
      expect(after!.reserved_until?.getTime()).toBe(reservedUntilBefore?.getTime());
    } finally {
      await deleteTestNumber(number);
    }
  });
});

test.describe("Scenario E: submission after expiry is refused safely", () => {
  test("submitting an order against an already-released number is refused, not silently accepted", async ({
    request,
  }) => {
    const number = await insertFreshNumber();
    try {
      // Never actually reserved — simulates arriving at the payment step
      // with a stale/expired session pointer. `submitOrder` re-validates
      // the reservation server-side regardless of what the client claims.
      const res = await request.post("/api/orders", {
        multipart: {
          full_name: "E2E Scenario E",
          university: "Universitas Surabaya",
          whatsapp: "+6281234500001",
          email: "scenario-e@example.com",
          package_id: "pkg_160gb",
          idempotency_key: `e2e-e-${Date.now()}`,
          proof: {
            name: "proof.jpg",
            mimeType: "image/jpeg",
            buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
          },
        },
      });

      expect(res.status()).toBeGreaterThanOrEqual(400);
      expect(res.status()).toBeLessThan(500);

      const row = await getNumber(number);
      expect(row!.status).toBe("available");
    } finally {
      await deleteTestNumber(number);
    }
  });
});
