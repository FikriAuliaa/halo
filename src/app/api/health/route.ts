/**
 * `GET /api/health` (B128) — liveness only: the process is responding.
 * Deliberately does not touch Postgres/Storage/config — a transient
 * database blip must not restart an otherwise-healthy process; that's
 * what `/api/health/ready` is for. No version numbers, dependency
 * versions, or internal hostnames — nothing here to leak.
 */
export async function GET(): Promise<Response> {
  return Response.json({ status: "ok" }, { status: 200 });
}
