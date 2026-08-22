import postgres from "postgres";

/**
 * A direct Postgres connection for E2E test setup/teardown/assertion —
 * deliberately bypassing the app's own repositories, since these helpers
 * exist precisely to seed isolated data and assert database state
 * independently of whatever the UI claims happened (B119: "assert
 * against the database state, not only the UI, since a UI can lie").
 */
const sql = postgres(
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:54322/postgres",
);

/** Every test-seeded number uses this prefix so it can never collide
 * with the real seeded inventory (`0811...`) or a previous run's leftovers
 * are trivially identifiable and cleanable. */
const TEST_PREFIX = "0899";

export function randomTestNumber(): string {
  const suffix = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
  return `${TEST_PREFIX}${suffix}`;
}

export async function insertFreshNumber(): Promise<string> {
  const number = randomTestNumber();
  await sql`insert into numbers (number) values (${number})`;
  return number;
}

export async function insertSoldOfflineNumber(): Promise<string> {
  const number = randomTestNumber();
  await sql`
    insert into numbers (number, status, sold_at, sold_channel)
    values (${number}, 'sold_offline', now(), 'offline')
  `;
  return number;
}

export async function deleteTestNumber(number: string): Promise<void> {
  // A completed scenario may have created a real order against this
  // number (`orders.number references numbers`) — delete it first or
  // the FK constraint refuses the number's own deletion.
  await sql`delete from orders where number = ${number}`;
  await sql`delete from numbers where number = ${number}`;
}

export async function getNumber(number: string) {
  const [row] = await sql`select * from numbers where number = ${number}`;
  return row ?? null;
}

export async function getOrderByRef(orderRef: string) {
  const [row] = await sql`select * from orders where order_ref = ${orderRef}`;
  return row ?? null;
}

export async function getAuditLogFor(entityType: string, entityId: string) {
  return sql`
    select * from audit_log
    where entity_type = ${entityType} and entity_id = ${entityId}
    order by created_at desc
  `;
}

/** Cleans up every leftover test-prefixed number and its orders — safe
 * to call before or after a run; matches nothing in the real inventory. */
export async function cleanupTestData(): Promise<void> {
  await sql`delete from orders where number like ${TEST_PREFIX + "%"}`;
  await sql`delete from numbers where number like ${TEST_PREFIX + "%"}`;
}

export async function closeDb(): Promise<void> {
  await sql.end();
}
