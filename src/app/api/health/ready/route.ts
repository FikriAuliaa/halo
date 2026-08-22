import { checkReadiness } from "@/server/operations/health";

/**
 * `GET /api/health/ready` (B128) — readiness: Postgres reachable,
 * required `config` rows present, required Storage buckets present.
 * Reports only component names and short, safe reasons (`ComponentStatus`'s
 * own doc comment) — never a raw driver error, host, or version string.
 */
export async function GET(): Promise<Response> {
  const result = await checkReadiness();
  return Response.json(result, { status: result.ready ? 200 : 503 });
}
