import {
  test,
  expect,
  request as playwrightRequest,
  type APIRequestContext,
} from "@playwright/test";
import { deleteTestNumber, insertFreshNumber, insertSoldOfflineNumber } from "./helpers/db";

/**
 * E2E scenarios J-L (B121): offline sales and authorization. No shared
 * `afterAll(cleanupTestData)` — see the doc comment in
 * `scenarios-a-e.spec.ts` for why that wildcard cleanup is unsafe under
 * `fullyParallel` and was removed; each test owns and deletes its own
 * number instead.
 */

test.describe("Scenario J: a sold_offline number cannot be reserved by a student", () => {
  test("reserving a sold_offline number is refused", async ({ request }) => {
    const number = await insertSoldOfflineNumber();
    try {
      const res = await request.post(`/api/numbers/${number}/reserve`, {
        data: { idempotency_key: `e2e-j-${Date.now()}` },
      });
      expect(res.status()).toBe(409);
      const body = await res.json();
      expect(body.error.code).toBe("NUMBER_UNAVAILABLE");
    } finally {
      await deleteTestNumber(number);
    }
  });
});

test.describe("Scenario K: unauthenticated access to the admin area is denied", () => {
  test("navigating to an admin page with no session redirects to login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("calling an admin API directly with no session is refused, not just the page route", async ({
    request,
  }) => {
    const res = await request.get("/api/admin/orders");
    expect(res.status()).toBe(401);
  });

  test("calling a mutating admin API directly with no session is refused", async ({ request }) => {
    const res = await request.post("/api/admin/numbers/sold-offline", {
      data: { numbers: ["0899000000"] },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("Scenario L: ADMIN_KAMPUS is refused for every ADMIN_TELKOMSEL-only operation", () => {
  // The full set of operations the permission matrix (`src/domain/
  // permissions.ts`) actually restricts to ADMIN_TELKOMSEL *and* that
  // have a real, callable endpoint. `adminOverrideOrderStatus`,
  // `adminUpdateSystemConfig`, and `adminManageAdmins` are declared in
  // the matrix but have no implemented route — an honest gap, not
  // silently skipped (see the Phase 15 gate report), so they're not
  // listed here as something this test could ever call.
  const telkomselOnlyOperations: Array<{
    name: string;
    request: (
      req: import("@playwright/test").APIRequestContext,
      number: string,
    ) => Promise<import("@playwright/test").APIResponse>;
  }> = [
    {
      name: "adminMarkSoldOffline",
      request: (req, number) =>
        req.post("/api/admin/numbers/sold-offline", { data: { numbers: [number] } }),
    },
    {
      name: "adminRunCleanup",
      request: (req) => req.post("/api/admin/cleanup/run", { data: {} }),
    },
    {
      name: "adminForceReleaseReservation",
      request: (req, number) =>
        req.post(`/api/admin/numbers/${number}/force-release`, { data: { reason: "e2e-l" } }),
    },
    {
      name: "adminConfirmPackagePrice",
      request: (req) =>
        req.post("/api/admin/config/packages/pkg_160gb/confirm-price", { data: {} }),
    },
    {
      name: "adminUpdatePaymentConfig",
      request: (req) =>
        req.post("/api/admin/config/payment", {
          multipart: { payment_label: "e2e-l attempt", scan_confirmed: "false" },
        }),
    },
  ];

  // A single shared, authenticated context for the whole block, loaded
  // from `global-setup.ts`'s saved `storageState` rather than logging
  // in here at all — logging in fresh per sub-test (five times) tripped
  // the admin-login rate limit this suite elsewhere confirms works
  // (found live running the full three-file suite together): the login
  // endpoint is intentionally tight (10/5min per IP, B115), and five
  // real logins from one machine in quick succession is exactly the
  // pattern it exists to slow down.
  let adminContext: APIRequestContext;

  test.beforeAll(async ({ baseURL }) => {
    adminContext = await playwrightRequest.newContext({
      ...(baseURL ? { baseURL } : {}),
      storageState: "e2e/.auth/kampus.json",
    });
  });

  test.afterAll(async () => {
    await adminContext.dispose();
  });

  for (const op of telkomselOnlyOperations) {
    test(`${op.name} is refused with 403, not just hidden client-side`, async () => {
      const number = await insertFreshNumber();
      try {
        const res = await op.request(adminContext, number);
        expect(res.status()).toBe(403);
      } finally {
        await deleteTestNumber(number);
      }
    });
  }
});
