import { sql } from "@/server/db/client";
import { createHandler } from "@/server/framework/handler";

/**
 * `GET /api/numbers/active-reservations`
 * Returns list of numbers that are currently reserved, pending, or sold
 * so client screens can proactively mark them as "Sedang Dipilih" / unavailable
 * across all connected devices in real time.
 */
export const GET = createHandler({}, async () => {
  const rows = await sql<{ number: string }[]>`
    SELECT number FROM numbers
    WHERE (status = 'reserved' AND reserved_until > NOW())
       OR status IN ('pending', 'sold', 'sold_offline')
  `;

  return {
    reservedNumbers: rows.map((r) => r.number),
  };
});
