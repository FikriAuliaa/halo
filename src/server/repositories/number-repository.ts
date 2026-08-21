import type postgres from "postgres";
import { sql, withTransaction } from "@/server/db/client";
import type { NumberRow } from "@/server/db/types";
import type { NumberStatus } from "@/domain/status";
import { shuffle } from "@/lib/array";

type Executor = postgres.Sql | postgres.TransactionSql;

export interface NumberListFilters {
  status?: NumberStatus | undefined;
  /** Digit substring, matched anywhere in the number (B106). */
  search?: string | undefined;
}

export type NumberSortField = "number" | "updated_at" | "sold_at";
export type NumberSortDirection = "asc" | "desc";

export interface NumberListPage {
  page: number;
  limit: number;
}

export interface NumberListResult {
  items: NumberRow[];
  total: number;
  page: number;
  limit: number;
}

/**
 * The only module that touches the `numbers` table directly. No
 * status-transition logic or expiry decisions live here (AGENTS.md,
 * B050) — those belong to `src/domain/number-status.ts` and are
 * orchestrated by `src/server/operations/*`, which compose these methods
 * (often several, inside one `withTransaction`) to enact a decision this
 * repository has no opinion about.
 */
export class NumberRepository {
  async get(number: string, tx?: Executor): Promise<NumberRow | null> {
    const db = tx ?? sql;
    const rows = await db<NumberRow[]>`select * from numbers where number = ${number}`;
    return rows[0] ?? null;
  }

  async exists(number: string): Promise<boolean> {
    return (await this.get(number)) !== null;
  }

  /**
   * `SELECT ... FOR UPDATE` — takes a real row lock for the duration of
   * `tx`. This is the Postgres replacement for Firestore's optimistic
   * transaction semantics: any concurrent transaction that also tries to
   * lock this row blocks until this one commits or rolls back, so two
   * callers can never both observe "available" before either writes
   * (B063's core guarantee). Every guard inside `reserveNumber` reads
   * through this, never through the unlocked `get`.
   */
  async getForUpdate(number: string, tx: postgres.TransactionSql): Promise<NumberRow | null> {
    const rows = await tx<NumberRow[]>`select * from numbers where number = ${number} for update`;
    return rows[0] ?? null;
  }

  /** Used only by the seed importer (B056) — never touches an existing row. */
  async createIfAbsent(doc: NumberRow): Promise<"created" | "already-present"> {
    const rows = await sql<{ number: string }[]>`
      insert into numbers ${sql(doc)}
      on conflict (number) do nothing
      returning number
    `;
    return rows.length > 0 ? "created" : "already-present";
  }

  /**
   * A raw field write. `updated_at` is auto-set by the `numbers_set_updated_at`
   * trigger on every UPDATE — never accepted from the caller — so no call
   * site can forget it (B050's original rule, now enforced at the DB layer).
   */
  async updateFields(
    number: string,
    fields: Partial<Omit<NumberRow, "number" | "updated_at">>,
    tx?: Executor,
  ): Promise<void> {
    if (Object.keys(fields).length === 0) return; // `sql({})` generates an invalid `SET` clause.
    const db = tx ?? sql;
    await db`update numbers set ${db(fields)} where number = ${number}`;
  }

  /** Used only by `adminRemoveNumber` and `adminUpdateNumber`'s rename
   * (B058) — both already assert the precondition before calling this. */
  async delete(number: string, tx?: Executor): Promise<void> {
    const db = tx ?? sql;
    await db`delete from numbers where number = ${number}`;
  }

  /**
   * Offset pagination with arbitrary sort, deliberately — the admin
   * inventory table (B106) needs sortable columns and a stable page
   * number, the same trade-off `OrderRepository.list` already makes for
   * the same reason (see its doc comment). The high-churn-write argument
   * that keeps the *public* number listing (`listEffectivelyAvailablePool`)
   * keyset-only doesn't apply here — this is an admin-only view.
   */
  async list(
    filters: NumberListFilters,
    sort: { field: NumberSortField; direction: NumberSortDirection },
    page: NumberListPage,
  ): Promise<NumberListResult> {
    const status = filters.status ?? null;
    const searchPattern = filters.search ? `%${filters.search}%` : null;

    const orderByClause =
      sort.field === "number"
        ? sort.direction === "asc"
          ? sql`order by number asc`
          : sql`order by number desc`
        : sort.field === "sold_at"
          ? sort.direction === "asc"
            ? sql`order by sold_at asc nulls last, number asc`
            : sql`order by sold_at desc nulls last, number asc`
          : sort.direction === "asc"
            ? sql`order by updated_at asc, number asc`
            : sql`order by updated_at desc, number asc`;

    const whereFragment = sql`
      where (${status}::number_status is null or status = ${status})
        and (${searchPattern}::text is null or number like ${searchPattern})
    `;

    const offset = (page.page - 1) * page.limit;
    const [items, [countRow]] = await Promise.all([
      sql<NumberRow[]>`
        select * from numbers
        ${whereFragment}
        ${orderByClause}
        limit ${page.limit} offset ${offset}
      `,
      sql<{ count: string }[]>`select count(*) from numbers ${whereFragment}`,
    ]);

    return { items, total: Number(countRow?.count ?? 0), page: page.page, limit: page.limit };
  }

  async countByStatus(status: NumberStatus): Promise<number> {
    const [row] = await sql<
      { count: string }[]
    >`select count(*) from numbers where status = ${status}`;
    return Number(row?.count ?? 0);
  }

  /** A random sample of currently-`available`-by-stored-status numbers
   * only — does not apply lazy expiry. Prefer `listEffectivelyAvailablePool`
   * for anything student-facing (B057); this exists for callers that
   * genuinely want the stored status, e.g. admin inventory views. */
  async sampleAvailable(limit: number): Promise<NumberRow[]> {
    const rows = await sql<NumberRow[]>`select * from numbers where status = 'available'`;
    return shuffle(rows).slice(0, limit);
  }

  /** The full pool of numbers that are effectively available right now:
   * stored `available`, plus stored `reserved` whose TTL has already
   * lapsed (lazy expiry, ADR-004) — regardless of whether the janitor has
   * gotten to them yet. Unlimited/unsampled; the caller (`getAvailableNumbers`,
   * B057) applies suffix filtering, exclusion, and random sampling on top. */
  async listEffectivelyAvailablePool(): Promise<NumberRow[]> {
    return sql<NumberRow[]>`
      select * from numbers
      where status = 'available'
         or (status = 'reserved' and reserved_until <= now())
    `;
  }

  /** Reserved numbers whose TTL has already lapsed — the janitor's input
   * (Phase 6), not a status-transition decision itself. */
  async listExpiredReservations(limit = 500): Promise<NumberRow[]> {
    return sql<NumberRow[]>`
      select * from numbers
      where status = 'reserved' and reserved_until <= now()
      limit ${limit}
    `;
  }

  async runTransaction<T>(fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
    return withTransaction(fn);
  }
}
