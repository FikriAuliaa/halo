import { AppError } from "@/lib/errors";
import type { AdminManageUniversitiesInput } from "@/schemas/config";
import type { UniversitiesConfigDoc } from "@/server/db/types";
import { withTransaction } from "@/server/db/client";
import { writeAuditLog } from "@/server/framework/audit-log";
import type { AdminContext } from "@/server/framework/handler";
import { configRepository, ConfigRepository } from "@/server/repositories/config-repository";
import { OrderRepository } from "@/server/repositories/order-repository";

/**
 * `adminManageUniversities` (B111) — full-document replace, like
 * `adminManagePackages`. There's no separate delete endpoint: omitting a
 * name from the submitted list *is* the delete, and it's refused when
 * any order references that name — a university with order history is
 * deactivated (`active: false`, still present in the list), never
 * actually removed, since removing it would orphan those orders' display
 * of which university they were for.
 */
export async function adminManageUniversities(
  input: AdminManageUniversitiesInput,
  actor: AdminContext,
  deps: { config: ConfigRepository; orderRepo: OrderRepository },
): Promise<UniversitiesConfigDoc> {
  const existing = await deps.config.getUniversities();
  const existingNames = new Set((existing?.list ?? []).map((u) => u.name));
  const incomingNames = new Set(input.list.map((u) => u.name));

  for (const name of existingNames) {
    if (incomingNames.has(name)) continue;
    const page = await deps.orderRepo.list(
      { university: name },
      { field: "submitted_at", direction: "desc" },
      { page: 1, limit: 1 },
    );
    if (page.total > 0) {
      throw new AppError(
        "CONFLICT",
        `"${name}" memiliki riwayat pesanan dan tidak dapat dihapus. Nonaktifkan sebagai gantinya.`,
      );
    }
  }

  await withTransaction(async (tx) => {
    await deps.config.setUniversities({ list: input.list }, tx);
    await writeAuditLog(tx, {
      actor_uid: actor.uid,
      actor_role: actor.role,
      action: "adminManageUniversities",
      entity_type: "config",
      entity_id: "universities",
      before: existing?.list ?? null,
      after: input.list,
      reason: null,
    });
  });

  return { list: input.list, updated_at: new Date() };
}

export function createAdminManageUniversitiesDeps() {
  return { config: configRepository, orderRepo: new OrderRepository() };
}
