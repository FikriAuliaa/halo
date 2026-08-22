import type { APIRequestContext, BrowserContext } from "@playwright/test";

export const ADMIN_TELKOMSEL = { email: "admin@halo.test", password: "TestPassword123!" };
export const ADMIN_KAMPUS = { email: "kampus@halo.test", password: "TestPassword123!" };

/**
 * Logs in via the real API (not by clicking through the login form —
 * that's exercised directly by its own test) and leaves the resulting
 * session cookie set on `context`, so subsequent `context.request.*` or
 * `page.goto(...)` calls are authenticated as that admin.
 */
export async function loginAsAdmin(
  context: BrowserContext,
  credentials: { email: string; password: string },
  baseURL: string,
): Promise<{ role: string }> {
  const res = await context.request.post(`${baseURL}/api/admin/session`, {
    data: credentials,
  });
  if (!res.ok()) {
    throw new Error(`Admin login failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

export async function apiLoginAsAdmin(
  request: APIRequestContext,
  credentials: { email: string; password: string },
): Promise<void> {
  const res = await request.post("/api/admin/session", { data: credentials });
  if (!res.ok()) {
    throw new Error(`Admin login failed: ${res.status()} ${await res.text()}`);
  }
}
