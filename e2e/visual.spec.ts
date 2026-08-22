import { test, expect } from "@playwright/test";

/**
 * Responsive/visual regression baselines (B123). No reference screenshots
 * exist anywhere in this repository (confirmed by search during Phase
 * 7-9) — screens were built from `DESIGN.md`'s token/spec descriptions,
 * not pixel-matched against a reference image. This suite therefore
 * establishes **baselines from the current implementation** for future
 * regression detection (`--update-snapshots` the first time it runs),
 * rather than comparing against a reference that was never supplied —
 * documented here as the honest scope, not silently substituted.
 *
 * Dynamic regions: the reservation countdown/timestamps don't appear on
 * any of these three routes, but the home route's number grid is itself
 * a random sample re-shuffled on every load (by design, C14 — so
 * repeated "Refresh" calls don't keep surfacing the same subset), which
 * is exactly the kind of region B123 warns will fail every run if left
 * unmasked — found live on the first real run of this suite (a 1%
 * pixel diff that had nothing to do with a regression).
 */

const WIDTHS = [320, 390, 600, 768, 1024, 1440];

const ROUTES: Array<{ name: string; path: string; dynamicSelector?: string }> = [
  { name: "home", path: "/", dynamicSelector: '[role="radiogroup"]' },
  { name: "tracking-lookup", path: "/lacak" },
  { name: "admin-login", path: "/admin/login" },
];

for (const route of ROUTES) {
  test.describe(`visual: ${route.name}`, () => {
    for (const width of WIDTHS) {
      test(`${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route.path);
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveScreenshot(`${route.name}-${width}.png`, {
          fullPage: true,
          animations: "disabled",
          mask: route.dynamicSelector ? [page.locator(route.dynamicSelector)] : [],
        });
      });
    }
  });
}
