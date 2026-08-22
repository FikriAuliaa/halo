import { request } from "@playwright/test";
import { ADMIN_KAMPUS, ADMIN_TELKOMSEL } from "./helpers/admin";

/**
 * Logs in as each admin role exactly once for the whole test run and
 * saves the resulting session as Playwright `storageState` — every test
 * that needs an authenticated admin (page or API context) loads one of
 * these files instead of calling `POST /api/admin/session` itself.
 *
 * Found live running the full E2E suite together (Phase 15): with each
 * spec file logging in independently, the *sum* of logins across
 * `scenarios-f-i.spec.ts`, `scenarios-j-l.spec.ts`, and `a11y.spec.ts`
 * exceeded the admin-login rate limit (10/5min per IP, B115) — a limit
 * that's correctly tight for its real purpose (slowing down credential
 * stuffing) but incompatible with "log in fresh for every test." One
 * login per role, reused everywhere, is also simply how a real admin
 * session behaves.
 */
export default async function globalSetup(): Promise<void> {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

  const telkomsel = await request.newContext({ baseURL });
  const telkomselRes = await telkomsel.post("/api/admin/session", { data: ADMIN_TELKOMSEL });
  if (!telkomselRes.ok()) {
    throw new Error(`global-setup: ADMIN_TELKOMSEL login failed: ${telkomselRes.status()}`);
  }
  await telkomsel.storageState({ path: "e2e/.auth/telkomsel.json" });
  await telkomsel.dispose();

  const kampus = await request.newContext({ baseURL });
  const kampusRes = await kampus.post("/api/admin/session", { data: ADMIN_KAMPUS });
  if (!kampusRes.ok()) {
    throw new Error(`global-setup: ADMIN_KAMPUS login failed: ${kampusRes.status()}`);
  }
  await kampus.storageState({ path: "e2e/.auth/kampus.json" });
  await kampus.dispose();
}
