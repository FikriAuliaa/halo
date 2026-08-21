/**
 * Keyset ("seek") pagination, not offset — offset pagination degrades
 * badly and cannot express a stable ordering across concurrent mutations
 * (carried over from the Firestore-era design, B050). The cursor encodes
 * the last-returned row's `(updated_at, key)` pair; the next page resumes
 * with `WHERE (updated_at, key) < (cursor.updated_at, cursor.key)` on the
 * same `ORDER BY updated_at DESC, key DESC`, which stays stable even as
 * rows before it change.
 */

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
}

export interface PaginationOptions {
  cursor?: string | undefined;
  limit: number;
}

export interface Keyset {
  updatedAt: Date;
  key: string;
}

export function encodeCursor(k: Keyset): string {
  return Buffer.from(JSON.stringify({ u: k.updatedAt.toISOString(), k: k.key })).toString(
    "base64url",
  );
}

export function decodeCursor(cursor: string | undefined): Keyset | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      u: string;
      k: string;
    };
    return { updatedAt: new Date(parsed.u), key: parsed.k };
  } catch {
    // A tampered or malformed cursor is treated as "start from the top" —
    // never as an error, and never trusted to seek into someone else's data.
    return null;
  }
}

/**
 * Slices a limit-plus-one row fetch into a page and the cursor for the
 * next one. Callers fetch `limit + 1` rows ordered by `updated_at DESC,
 * key DESC` (optionally seeked past a decoded cursor) and pass the result
 * here.
 */
export function paginateRows<T>(
  rows: T[],
  limit: number,
  keyOf: (row: T) => { updatedAt: Date; key: string },
): PaginatedResult<T> {
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  return {
    items,
    nextCursor: hasMore && last ? encodeCursor(keyOf(last)) : null,
  };
}
