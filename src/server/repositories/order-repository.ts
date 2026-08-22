import type postgres from "postgres";
import { sql, withTransaction } from "@/server/db/client";
import type { OrderRow } from "@/server/db/types";
import type { OrderStatus } from "@/domain/status";
import { normalizePhone } from "@/domain/phone";

type Executor = postgres.Sql | postgres.TransactionSql;

export interface OrderListFilters {
  status?: OrderStatus | undefined;
  university?: string | undefined;
  package_id?: string | undefined;
  submitted_from?: Date | undefined;
  submitted_to?: Date | undefined;
  /** Matches `order_ref`, `full_name`, or `number` — the number half is
   * matched after normalising the search term through the same `08...`
   * canonical form the column stores, so pasting `+62811...` still finds
   * an order stored as `0811...` (B101). */
  search?: string | undefined;
}

export type OrderSortField = "submitted_at" | "verified_at" | "full_name";
export type OrderSortDirection = "asc" | "desc";

export interface OrderListPage {
  page: number;
  limit: number;
}

export interface OrderListResult {
  items: OrderRow[];
  total: number;
  page: number;
  limit: number;
}

/**
 * The only module that touches the `orders` table directly. No
 * verification/rejection business logic lives here (B050) — see
 * `src/server/operations/admin/orders/*` for the transactional
 * verify/reject flows that compose these methods.
 */
export class OrderRepository {
  async get(orderId: string, tx?: Executor): Promise<OrderRow | null> {
    const db = tx ?? sql;
    const rows = await db<OrderRow[]>`select * from orders where id = ${orderId}`;
    return rows[0] ?? null;
  }

  async getForUpdate(orderId: string, tx: postgres.TransactionSql): Promise<OrderRow | null> {
    const rows = await tx<OrderRow[]>`select * from orders where id = ${orderId} for update`;
    return rows[0] ?? null;
  }

  /** `doc.id` is caller-supplied (`crypto.randomUUID()`), not the
   * table's own default — `submitOrder` needs the order's ID *before*
   * the insert, to name the proof file's storage path (B085). */
  async create(doc: Omit<OrderRow, "created_at" | "updated_at">, tx?: Executor): Promise<string> {
    const db = tx ?? sql;
    const [row] = await db<{ id: string }[]>`
      insert into orders ${db(doc)}
      returning id
    `;
    return row!.id;
  }

  async updateFields(
    orderId: string,
    fields: Partial<Omit<OrderRow, "id" | "created_at" | "updated_at">>,
    tx?: Executor,
  ): Promise<void> {
    if (Object.keys(fields).length === 0) return; // `sql({})` generates an invalid `SET` clause.
    const db = tx ?? sql;
    await db`update orders set ${db(fields)} where id = ${orderId}`;
  }

  /** ADR-005's lookup contract: an exact match on both halves is required;
   * the caller (getTrackingStatus) is responsible for treating "no match"
   * uniformly regardless of which half was wrong. */
  async findByRefAndTokenHash(
    orderRef: string,
    trackingTokenHash: string,
  ): Promise<OrderRow | null> {
    const rows = await sql<OrderRow[]>`
      select * from orders where order_ref = ${orderRef} and tracking_token_hash = ${trackingTokenHash}
      limit 1
    `;
    return rows[0] ?? null;
  }

  /**
   * Offset pagination, deliberately — unlike `NumberRepository`'s
   * keyset-only rule (justified there by high-churn concurrent writes
   * under a public endpoint), this is an admin-only table view with
   * arbitrary sort fields, where a stable keyset tuple would have to vary
   * per sort column. The admin re-running a search after someone else's
   * concurrent write shifts a page boundary is an acceptable, low-stakes
   * trade-off here.
   */
  async list(
    filters: OrderListFilters,
    sort: { field: OrderSortField; direction: OrderSortDirection },
    page: OrderListPage,
  ): Promise<OrderListResult> {
    const status = filters.status ?? null;
    const university = filters.university ?? null;
    const packageId = filters.package_id ?? null;
    const submittedFrom = filters.submitted_from ?? null;
    const submittedTo = filters.submitted_to ?? null;

    let searchPattern: string | null = null;
    if (filters.search) {
      const normalized = normalizePhone(filters.search);
      const term = normalized.ok && normalized.value ? normalized.value : filters.search;
      searchPattern = `%${term}%`;
    }

    const orderByClause =
      sort.field === "submitted_at"
        ? sort.direction === "asc"
          ? sql`order by submitted_at asc, id asc`
          : sql`order by submitted_at desc, id desc`
        : sort.field === "verified_at"
          ? sort.direction === "asc"
            ? sql`order by verified_at asc nulls last, id asc`
            : sql`order by verified_at desc nulls last, id desc`
          : sort.direction === "asc"
            ? sql`order by full_name asc, id asc`
            : sql`order by full_name desc, id desc`;

    const whereFragment = sql`
      where (${status}::order_status is null or status = ${status})
        and (${university}::text is null or university = ${university})
        and (${packageId}::text is null or package_id = ${packageId})
        and (${submittedFrom}::timestamptz is null or submitted_at >= ${submittedFrom})
        and (${submittedTo}::timestamptz is null or submitted_at <= ${submittedTo})
        and (
          ${searchPattern}::text is null
          or order_ref ilike ${searchPattern}
          or full_name ilike ${searchPattern}
          or number ilike ${searchPattern}
        )
    `;

    const offset = (page.page - 1) * page.limit;
    const [items, [countRow]] = await Promise.all([
      sql<OrderRow[]>`
        select * from orders
        ${whereFragment}
        ${orderByClause}
        limit ${page.limit} offset ${offset}
      `,
      sql<{ count: string }[]>`select count(*) from orders ${whereFragment}`,
    ]);

    return { items, total: Number(countRow?.count ?? 0), page: page.page, limit: page.limit };
  }

  async countByStatus(status: OrderStatus): Promise<number> {
    const [row] = await sql<
      { count: string }[]
    >`select count(*) from orders where status = ${status}`;
    return Number(row?.count ?? 0);
  }

  async runTransaction<T>(fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
    return withTransaction(fn);
  }
}
