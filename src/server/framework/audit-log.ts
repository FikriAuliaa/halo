import type postgres from "postgres";
import type { AdminRole } from "@/schemas/admin";

/** `entry.before`/`entry.after` are always plain, JSON-safe snapshots of a
 * row — `postgres.JSONValue`'s recursive structural type can't be proven
 * against an `unknown`-typed value without a cast, even though it's
 * always true at these call sites. */
function asJson(value: unknown): postgres.JSONValue {
  return value as postgres.JSONValue;
}

/**
 * The permanent record of every trusted-tier mutation (ADR-010, B058) —
 * distinct from operational logs, which rotate out of retention. Written
 * inside the same transaction as the mutation it describes, same
 * reasoning as `idempotency.ts`: a record written after the fact isn't a
 * guarantee, just a hope.
 */
export interface AuditLogEntry {
  actor_uid: string;
  actor_role: AdminRole;
  action: string;
  entity_type: string;
  entity_id: string;
  before: unknown;
  after: unknown;
  reason: string | null;
}

export async function writeAuditLog(
  tx: postgres.TransactionSql,
  entry: AuditLogEntry,
): Promise<void> {
  await tx`
    insert into audit_log (actor_uid, actor_role, action, entity_type, entity_id, before, after, reason, created_at)
    values (
      ${entry.actor_uid},
      ${entry.actor_role},
      ${entry.action},
      ${entry.entity_type},
      ${entry.entity_id},
      ${entry.before === null ? null : tx.json(asJson(entry.before))},
      ${entry.after === null ? null : tx.json(asJson(entry.after))},
      ${entry.reason},
      now()
    )
  `;
}
