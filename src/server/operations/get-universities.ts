import { configRepository } from "@/server/repositories/config-repository";

export interface GetUniversitiesResult {
  universities: string[];
}

/** `getUniversities` (B078) — active names only. This same active-name
 * set is the server-side allowlist `submitOrder` validates against; a
 * crafted request can't inject an off-list institution. */
export async function getUniversities(): Promise<GetUniversitiesResult> {
  const config = await configRepository.getUniversities();
  const universities = (config?.list ?? []).filter((u) => u.active).map((u) => u.name);
  return { universities };
}
