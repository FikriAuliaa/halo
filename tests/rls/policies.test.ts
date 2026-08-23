import { describe, expect, it } from "vitest";

/**
 * RLS coverage (B113) — turns the manual audit recorded in
 * `docs/reports/phase-14-gate.md`/`SECURITY.md` into a standing
 * regression test. Every table has RLS **enabled with zero policies**
 * (`supabase/migrations/20260101000000_init.sql`), so there is nothing
 * per-table to parametrize the way a real policy set would need — the
 * one thing worth continuously verifying is that the anon role (the one
 * credential a leaked client config could expose) is denied everywhere,
 * and that it stays denied as tables are added.
 *
 * `ANON_KEY` is the Supabase CLI's well-known, publicly-documented local
 * development default (identical for every `supabase init` project) —
 * not a secret, the same way the service-role key used by other
 * integration tests in this repo isn't one either. This suite only ever
 * targets the local Supabase stack (`SUPABASE_URL`, defaulting to the
 * local Kong port); it has no meaning against a real deployment.
 */
const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const TABLES = [
  "config",
  "numbers",
  "orders",
  "sessions",
  "audit_log",
  "idempotency_keys",
  "rate_limits",
  "admin_users",
];

async function anonSelect(table: string): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });
}

describe("RLS: every table denies the anon role", () => {
  for (const table of TABLES) {
    it(`${table} rejects an anonymous read`, async () => {
      const res = await anonSelect(table);
      expect(res.status).toBe(401);
    });
  }
});

describe("RLS: Storage buckets", () => {
  it("the private proofs bucket lists nothing for the anon role", async () => {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/proofs`, {
      method: "POST",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefix: "" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown[];
    expect(body).toEqual([]);
  });

  it("the private proofs bucket refuses an anon upload", async () => {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/proofs/rls-test.txt`, {
      method: "POST",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        "Content-Type": "text/plain",
      },
      body: "should never be written",
    });
    expect(res.ok).toBe(false);
  });

  it("the public payment-assets bucket refuses an anon upload (reads stay public by design)", async () => {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/payment-assets/rls-test.txt`, {
      method: "POST",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        "Content-Type": "text/plain",
      },
      body: "should never be written",
    });
    expect(res.ok).toBe(false);
  });
});
