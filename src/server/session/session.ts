import { withTransaction } from "@/server/db/client";
import type { SessionRow } from "@/server/db/types";
import { SessionRepository } from "./session-repository";

const repo = new SessionRepository();

/**
 * Resolves or lazily creates the Postgres-backed session identity for an
 * already-cookie-resolved `sessionId` (B061). The cookie itself — minting,
 * `httpOnly`/`Secure`/`SameSite=Lax`, 32-byte CSPRNG value — is handled
 * once, centrally, by `createHandler` (`src/server/framework/session.ts`);
 * this only ensures the matching `sessions` row exists, for operations
 * where the browser's first contact with the ordering flow legitimately
 * creates state (`reserveNumber`).
 */
export async function getOrCreateSession(sessionId: string): Promise<SessionRow> {
  return withTransaction(async (tx) => {
    const existing = await repo.get(sessionId, tx);
    await repo.ensureExists(sessionId, existing, tx);
    return (
      existing ?? {
        id: sessionId,
        created_at: new Date(),
        last_seen_at: new Date(),
        current_reservation: null,
      }
    );
  });
}

/**
 * For operations that act on an *existing* reservation and must never
 * silently fabricate a session record for a browser that never reserved
 * anything (`validateReservation`, `releaseReservation`) — resolves the
 * session row without creating one, and never writes (both callers treat
 * "no session" as a legitimate outcome — `not_found` status, or an
 * idempotent no-op — never a hard failure that a throw here would force).
 */
export async function requireSession(sessionId: string): Promise<SessionRow | null> {
  return repo.get(sessionId);
}

export { SessionRepository, type CurrentReservation } from "./session-repository";
