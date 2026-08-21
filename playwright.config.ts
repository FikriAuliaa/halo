import { defineConfig, devices } from "@playwright/test";

// Two viewport projects per B028/TEST_PLAN.md: mobile-first (the design
// reference is 480px-max end to end) plus a desktop check for the
// responsive behavior DESIGN.md §9 specifies beyond the reference.
export default defineConfig({
  testDir: "./e2e",
  // Logs in once per admin role and saves `storageState` — see its own
  // doc comment for the rate-limit collision this fixes.
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "mobile",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    // WebKit-only smoke check, not the full suite (tripling CI runtime
    // across three engines isn't worth it for this app). Exists because
    // Chromium alone missed a real, page-breaking bug: WebKit enforces
    // a CSP's `upgrade-insecure-requests` far more aggressively than
    // Chromium, upgrading every subresource request to HTTPS even on a
    // plain-HTTP page — which silently failed every CSS/JS/font load in
    // Safari specifically, on a dev server with no HTTPS listener.
    {
      name: "webkit-smoke",
      use: { ...devices["Desktop Safari"] },
      testMatch: /smoke\.spec\.ts/,
    },
  ],
  webServer: {
    // E2E_TARGET=production is how the "gallery route is unreachable in
    // production" test (B047) gets a real production server to check
    // against — see the test:e2e:prod script.
    command: process.env.E2E_TARGET === "production" ? "pnpm build && pnpm start" : "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
