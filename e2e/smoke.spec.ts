import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Proves the Playwright + axe-core wiring (B028). The real flow
// coverage now lives in the E2E scenarios (A–L, Phase 15) — this stays
// as a fast, standing smoke check that the homepage renders at all.
// The heading assertion below was stale (checked for the pre-Phase-7
// bootstrap placeholder's "Halo Kampus" heading, which no longer
// exists — the real homepage is the number-selection screen) until
// this pass; found live while running the full suite for Phase 15.
test("root page loads the number-selection screen", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Pilih Nomor Halo Keinginanmu" })).toBeVisible();
});

test("root bootstrap page has no serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(serious).toEqual([]);
});
