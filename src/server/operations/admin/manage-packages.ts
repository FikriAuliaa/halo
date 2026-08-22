import { AppError } from "@/lib/errors";
import type { AdminManagePackagesInput } from "@/schemas/config";
import type { PackageEntry } from "@/server/db/types";
import { writeAuditLog } from "@/server/framework/audit-log";
import type { AdminContext } from "@/server/framework/handler";
import { withTransaction } from "@/server/db/client";
import { configRepository, ConfigRepository } from "@/server/repositories/config-repository";
import { OrderRepository } from "@/server/repositories/order-repository";

export interface AdminManagePackagesWarning {
  id: string;
  affected_pending_orders: number;
}

export interface AdminManagePackagesResult {
  packages: PackageEntry[];
  warnings: AdminManagePackagesWarning[];
}

/**
 * `adminManagePackages` (B110) — full-document replace of the `packages`
 * config row, like `adminManageUniversities`. Two rules can't be
 * expressed by the shared "any role" route permission
 * (`ADMIN_PERMISSIONS.adminManagePackages`) alone, so they're enforced
 * here instead: only `ADMIN_TELKOMSEL` may change a price, and
 * `price_status` can never move here at all — confirming a price is a
 * separate, deliberate action (`adminConfirmPackagePrice`), not a side
 * effect of an unrelated metadata edit slipping through the same save.
 */
export async function adminManagePackages(
  input: AdminManagePackagesInput,
  actor: AdminContext,
  deps: { config: ConfigRepository; orderRepo: OrderRepository },
): Promise<AdminManagePackagesResult> {
  const existing = await deps.config.getPackages();
  const byId = new Map((existing?.packages ?? []).map((p) => [p.id, p]));

  for (const incoming of input.packages) {
    const before = byId.get(incoming.id);
    if (before && before.price !== incoming.price && actor.role !== "ADMIN_TELKOMSEL") {
      throw new AppError(
        "FORBIDDEN",
        "Hanya ADMIN_TELKOMSEL yang dapat mengubah harga paket.",
        "price",
      );
    }
    const beforeStatus = before?.price_status ?? "draft";
    if (incoming.price_status !== beforeStatus) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Gunakan tindakan konfirmasi harga terpisah untuk mengubah status harga.",
        "price_status",
      );
    }
  }

  const warnings: AdminManagePackagesWarning[] = [];
  for (const incoming of input.packages) {
    const before = byId.get(incoming.id);
    if (before?.active && !incoming.active) {
      const page = await deps.orderRepo.list(
        { status: "pending", package_id: incoming.id },
        { field: "submitted_at", direction: "desc" },
        { page: 1, limit: 1 },
      );
      if (page.total > 0) {
        warnings.push({ id: incoming.id, affected_pending_orders: page.total });
      }
    }
  }

  await withTransaction(async (tx) => {
    await deps.config.setPackages({ packages: input.packages }, tx);
    await writeAuditLog(tx, {
      actor_uid: actor.uid,
      actor_role: actor.role,
      action: "adminManagePackages",
      entity_type: "config",
      entity_id: "packages",
      before: existing?.packages ?? null,
      after: input.packages,
      reason: null,
    });
  });

  return { packages: input.packages, warnings };
}

export function createAdminManagePackagesDeps() {
  return { config: configRepository, orderRepo: new OrderRepository() };
}
