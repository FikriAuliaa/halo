import { AppError } from "@/lib/errors";
import { withTransaction } from "@/server/db/client";
import { writeAuditLog } from "@/server/framework/audit-log";
import type { AdminContext } from "@/server/framework/handler";
import { configRepository, ConfigRepository } from "@/server/repositories/config-repository";

/**
 * `adminConfirmPackagePrice` (B110, OQ-1) — the one, deliberate way a
 * package's `price_status` ever moves from `draft` to `confirmed`.
 * Kept as its own operation, not a field inside the general
 * `adminManagePackages` save, specifically so confirming a price can
 * never happen as a side effect of an unrelated edit — `adminManagePackages`
 * itself refuses any submitted `price_status` change and points here.
 */
export async function adminConfirmPackagePrice(
  packageId: string,
  actor: AdminContext,
  deps: { config: ConfigRepository },
) {
  const doc = await deps.config.getPackages();
  const pkg = doc?.packages.find((p) => p.id === packageId);
  if (!doc || !pkg) {
    throw new AppError("NOT_FOUND", "Paket tidak ditemukan.");
  }
  if (pkg.price_status === "confirmed") {
    throw new AppError("CONFLICT", "Harga paket ini sudah dikonfirmasi.");
  }

  const updated = doc.packages.map((p) =>
    p.id === packageId ? { ...p, price_status: "confirmed" as const } : p,
  );

  await withTransaction(async (tx) => {
    await deps.config.setPackages({ packages: updated }, tx);
    await writeAuditLog(tx, {
      actor_uid: actor.uid,
      actor_role: actor.role,
      action: "adminConfirmPackagePrice",
      entity_type: "package",
      entity_id: packageId,
      before: pkg,
      after: { ...pkg, price_status: "confirmed" },
      reason: null,
    });
  });

  return { id: packageId, price_status: "confirmed" as const };
}

export function createAdminConfirmPackagePriceDeps() {
  return { config: configRepository };
}
