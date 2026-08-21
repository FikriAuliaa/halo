import { z } from "zod";
import { numberIdSchema } from "./common";

/** `adminMarkSoldOffline` — single or bulk (RUNBOOK.md's daily recap procedure). */
export const adminMarkSoldOfflineSchema = z.object({
  numbers: z
    .array(numberIdSchema)
    .min(1, "Masukkan minimal satu nomor")
    .max(200, "Maksimal 200 nomor per permintaan"),
});
export type AdminMarkSoldOfflineInput = z.infer<typeof adminMarkSoldOfflineSchema>;

/** Admin role claim shape, set via the bootstrap script (ADR-002). */
export const adminRoleSchema = z.enum(["ADMIN_KAMPUS", "ADMIN_TELKOMSEL"]);
export type AdminRole = z.infer<typeof adminRoleSchema>;

/**
 * `adminListNumbers`, `adminAddNumbers`, `adminUpdateNumber` live in
 * `./number.ts` alongside the student-facing number schemas, not here —
 * they were scaffolded there first (B049) and B058 builds on those
 * definitions rather than re-declaring them.
 */

/** `adminForceReleaseReservation` (B068) — genuinely destructive, so the
 * reason is mandatory, not optional the way `adminRemoveNumber`'s isn't. */
export const adminForceReleaseSchema = z.object({
  reason: z.string().min(1, "Alasan wajib diisi").max(500, "Alasan maksimal 500 karakter"),
});
export type AdminForceReleaseInput = z.infer<typeof adminForceReleaseSchema>;
