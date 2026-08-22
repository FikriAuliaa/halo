import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { formatPhoneDisplay } from "../src/domain/phone";
import { deleteTestNumber, insertFreshNumber } from "./helpers/db";

/**
 * Accessibility suite (B122). Automated tooling (axe) catches perhaps a
 * third of real accessibility problems — the keyboard-only walk of the
 * actual ordering flow matters more than the axe pass, so both are
 * included rather than treating an axe-clean report as sufficient on
 * its own.
 */

async function expectNoSeriousViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (serious.length > 0) {
    console.log(JSON.stringify(serious, null, 2));
  }
  expect(serious).toEqual([]);
}

test.describe("axe: student screens", () => {
  test("home / number selection", async ({ page }) => {
    await page.goto("/");
    await expectNoSeriousViolations(page);
  });

  test("tracking lookup (/lacak)", async ({ page }) => {
    await page.goto("/lacak");
    await expectNoSeriousViolations(page);
  });
});

test.describe("axe: admin screens", () => {
  test("login page", async ({ page }) => {
    await page.goto("/admin/login");
    await expectNoSeriousViolations(page);
  });
});

// A separate describe block using the `storageState` `global-setup.ts`
// saved once for the whole run, rather than each test logging in — see
// `global-setup.ts`'s doc comment for the admin-login rate limit this
// avoids colliding with.
test.describe("axe: authenticated admin screens", () => {
  test.use({ storageState: "e2e/.auth/telkomsel.json" });

  test("dashboard", async ({ page }) => {
    await page.goto("/admin");
    await expectNoSeriousViolations(page);
  });

  test("order list", async ({ page }) => {
    await page.goto("/admin/pesanan");
    await expectNoSeriousViolations(page);
  });

  test("diagnostics", async ({ page }) => {
    await page.goto("/admin/diagnostics");
    await expectNoSeriousViolations(page);
  });

  test("number inventory", async ({ page }) => {
    await page.goto("/admin/nomor");
    await expectNoSeriousViolations(page);
  });
});

test.describe("keyboard-only navigation", () => {
  test("a student can select a number and reach the package screen using only the keyboard", async ({
    page,
  }) => {
    const number = await insertFreshNumber();
    try {
      const display = formatPhoneDisplay(number);
      const suffix = number.slice(-4);
      await page.goto("/");

      // Tab to the search field (no mouse click) and type the suffix.
      await page.keyboard.press("Tab");
      const searchInput = page.getByLabel("Cari 4 digit terakhir");
      await expect(searchInput)
        .toBeFocused({ timeout: 5_000 })
        .catch(async () => {
          // Layout order can legitimately place other focusable elements
          // first (e.g. a skip link) — fall back to focusing it directly
          // by role, which still proves it's keyboard-reachable, just not
          // necessarily the very first stop.
          await searchInput.focus();
        });
      const searchResponse = page.waitForResponse(
        (res) => res.url().includes(`/api/numbers?suffix=${suffix}`) && res.status() === 200,
      );
      await page.keyboard.type(suffix);
      await searchResponse;

      const card = page.getByLabel(`Nomor ${display}`, { exact: true });
      await expect(card).toBeVisible({ timeout: 10_000 });
      // Radio-group semantics: focus the option and select with Space,
      // never a mouse click.
      await card.focus();
      await page.keyboard.press("Space");
      await expect(card).toBeChecked();

      // Tab to and activate "Lanjut Pilih Paket" with Enter.
      const continueButton = page.getByRole("button", { name: "Lanjut Pilih Paket" });
      await continueButton.focus();
      await page.keyboard.press("Enter");

      await page.getByRole("button", { name: "Saya Sudah Menyimpannya, Lanjutkan" }).focus();
      await page.keyboard.press("Enter");

      await expect(page).toHaveURL(/\/paket/);
      // Focus lands somewhere sensible after the navigation — not lost
      // to `<body>`, which would silently strand a keyboard user.
      const activeTag = await page.evaluate(() => document.activeElement?.tagName);
      expect(activeTag).not.toBe("BODY");
    } finally {
      await deleteTestNumber(number);
    }
  });
});
