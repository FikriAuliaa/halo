import type postgres from "postgres";
import { sql, withTransaction } from "@/server/db/client";

/** See `audit-log.ts`'s `asJson` — same reasoning: `result` is always a
 * plain, JSON-safe operation response. */
function asJson(value: unknown): postgres.JSONValue {
  return value as postgres.JSONValue;
}

/**
 * Caller-supplied idempotency keys (B052) — a retried `reserveNumber` or
 * `submitOrder` (client timeout, double-click, retried fetch) returns the
 * original result instead of re-executing. The record is written **inside**
 * the same transaction as the mutation it protects; writing it outside that
 * transaction would make the guarantee decorative — a crash between "do the
 * mutation" and "record the key" would let a retry through unprotected.
 */

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

interface IdempotencyRow {
  key: string;
  operation: string;
  result: unknown;
  created_at: Date;
}

export interface IdempotencyCheck<T> {
  /** `true` if a prior call already completed — `cachedResult` is authoritative and the caller must not re-execute. */
  alreadyCompleted: boolean;
  cachedResult: T | null;
}

function isExpired(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() > IDEMPOTENCY_TTL_MS;
}

/** Read-only check, usable outside a transaction for a cheap early-out
 * before doing any real work. */
export async function checkIdempotencyKey<T>(
  key: string,
  operation: string,
): Promise<IdempotencyCheck<T>> {
  const [row] = await sql<IdempotencyRow[]>`select * from idempotency_keys where key = ${key}`;
  if (!row) return { alreadyCompleted: false, cachedResult: null };
  if (row.operation !== operation) {
    // A key reused across a different operation is a caller bug, not a
    // legitimate retry — treat it as "not completed" for this operation
    // rather than returning a mismatched cached result.
    return { alreadyCompleted: false, cachedResult: null };
  }
  if (isExpired(row.created_at)) {
    return { alreadyCompleted: false, cachedResult: null };
  }
  return { alreadyCompleted: true, cachedResult: row.result as T };
}

/**
 * Composes the check-inside-transaction + record-inside-transaction
 * pattern so a call site can't accidentally split them across two
 * transactions. `mutate` runs inside the same transaction as the
 * idempotency check and the row insert.
 *
 * Unlike the old Firestore version, this transaction uses real row
 * locking (`FOR UPDATE`) on the idempotency row, so two genuinely
 * concurrent calls with the same key don't both reach `mutate`'s body —
 * the second blocks until the first commits, then reads the first's
 * result straight back out. `mutate` still must only produce effects by
 * staging writes through the given `tx`.
 */
export async function withIdempotency<T>(
  key: string,
  operation: string,
  mutate: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  return withTransaction(async (tx) => {
    const [existing] = await tx<
      IdempotencyRow[]
    >`select * from idempotency_keys where key = ${key} for update`;
    if (existing && existing.operation === operation && !isExpired(existing.created_at)) {
      return existing.result as T;
    }
    const result = await mutate(tx);
    await tx`
      insert into idempotency_keys (key, operation, result, created_at)
      values (${key}, ${operation}, ${tx.json(asJson(result))}, now())
      on conflict (key) do update set operation = excluded.operation, result = excluded.result, created_at = now()
    `;
    return result;
  });
}
