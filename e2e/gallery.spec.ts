import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// The dev-only component gallery (B047) is the standing accessibility gate
// for the whole design-system library — every future component addition
// gets added here and is covered by this same axe pass.
test("component gallery has no serious or critical accessibility violations", async ({ page }) => {
  await page.goto("/gallery");
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (serious.length > 0) {
    console.log(JSON.stringify(serious, null, 2));
  }
  expect(serious).toEqual([]);
});

test("the gallery route is unreachable in a production build", async ({ page }) => {
  // This test only makes the assertion meaningful when run against a
  // production server (see package.json's test:e2e:prod script); against
  // the dev server the route is expected to be reachable.
  test.skip(process.env.E2E_TARGET !== "production", "only meaningful against a production build");
  const response = await page.goto("/gallery");
  expect(response?.status()).toBe(404);
});
