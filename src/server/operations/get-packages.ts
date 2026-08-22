import { configRepository } from "@/server/repositories/config-repository";
import type { PackageEntry } from "@/server/db/types";

export interface GetPackagesResult {
  packages: PackageEntry[];
}

/** `getPackages` (B075) — active packages only, in `display_order`. No
 * price, quota, or label is ever hardcoded in a component; this is the
 * only path a screen may learn them through. */
export async function getPackages(): Promise<GetPackagesResult> {
  const config = await configRepository.getPackages();
  const packages = (config?.packages ?? [])
    .filter((p) => p.active)
    .sort((a, b) => a.display_order - b.display_order);
  return { packages };
}
