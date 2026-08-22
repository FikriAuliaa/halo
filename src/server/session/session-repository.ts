import type postgres from "postgres";
import { sql, withTransaction } from "@/server/db/client";
import type { SessionRow } from "@/server/db/types";

type Executor = postgres.Sql | postgres.TransactionSql;

export type CurrentReservation = NonNullable<SessionRow["current_reservation"]>;

/**
 * The only module that touches the `sessions` table directly (B061),
 * mirroring `NumberRepository`'s own layering rule.
 */
export class SessionRepository {
  async get(sessionId: string, tx?: Executor): Promise<SessionRow | null> {
    const db = tx ?? sql;
    const rows = await db<SessionRow[]>`select * from sessions where id = ${sessionId}`;
    return rows[0] ?? null;
  }

  /** `SELECT ... FOR UPDATE` — see `NumberRepository.getForUpdate`. Used
   * by `reserveNumber`'s A5 check so a concurrent reservation attempt
   * from the same session can't race past the "does this session already
   * hold a live reservation" guard. */
  async getForUpdate(sessionId: string, tx: postgres.TransactionSql): Promise<SessionRow | null> {
    const rows = await tx<SessionRow[]>`select * from sessions where id = ${sessionId} for update`;
    return rows[0] ?? null;
  }

  /** Creates the row on first contact; otherwise only touches
   * `last_seen_at`, never disturbing `current_reservation`. */
  async ensureExists(sessionId: string, existing: SessionRow | null, tx: Executor): Promise<void> {
    if (existing === null) {
      await tx`
        insert into sessions (id, created_at, last_seen_at, current_reservation)
        values (${sessionId}, now(), now(), null)
        on conflict (id) do update set last_seen_at = now()
      `;
    } else {
      await tx`update sessions set last_seen_at = now() where id = ${sessionId}`;
    }
  }

  async setCurrentReservation(
    sessionId: string,
    currentReservation: CurrentReservation | null,
    tx: Executor,
  ): Promise<void> {
    await tx`
      update sessions
      set current_reservation = ${currentReservation ? sql.json(currentReservation) : null},
          last_seen_at = now()
      where id = ${sessionId}
    `;
  }

  /**
   * Combines "create on first contact" and "point at this reservation"
   * into a single upsert (B063) — mirrors the old Firestore version's
   * reasoning about not issuing two writes to the same document/row
   * within one transaction.
   */
  async recordReservation(
    sessionId: string,
    existing: SessionRow | null,
    currentReservation: CurrentReservation,
    tx: Executor,
  ): Promise<void> {
    if (existing === null) {
      await tx`
        insert into sessions (id, created_at, last_seen_at, current_reservation)
        values (${sessionId}, now(), now(), ${sql.json(currentReservation)})
        on conflict (id) do update
          set last_seen_at = now(), current_reservation = ${sql.json(currentReservation)}
      `;
    } else {
      await tx`
        update sessions
        set last_seen_at = now(), current_reservation = ${sql.json(currentReservation)}
        where id = ${sessionId}
      `;
    }
  }

  async runTransaction<T>(fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
    return withTransaction(fn);
  }
}
