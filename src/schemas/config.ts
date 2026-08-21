import { z } from "zod";
import { packageIdSchema } from "./common";

/** `adminManagePackages` — full-document replace, validated per entry. */
export const packageEntrySchema = z.object({
  id: packageIdSchema,
  label: z.string().min(1, "Label paket wajib diisi"),
  price: z.number().int().nonnegative("Harga tidak boleh negatif"),
  price_status: z.enum(["draft", "confirmed"]),
  quota_internet_gb: z.number().int().positive("Kuota internet wajib lebih dari 0"),
  quota_roaming_gb: z.number().int().nonnegative(),
  voice_minutes: z.number().int().nonnegative(),
  sms_count: z.number().int().nonnegative(),
  recommended: z.boolean(),
  active: z.boolean(),
  display_order: z.number().int(),
});
export type PackageEntryInput = z.infer<typeof packageEntrySchema>;

export const adminManagePackagesSchema = z.object({
  packages: z.array(packageEntrySchema).min(1, "Minimal satu paket wajib ada"),
});
export type AdminManagePackagesInput = z.infer<typeof adminManagePackagesSchema>;

/** `adminManageUniversities`. */
export const universityEntrySchema = z.object({
  name: z.string().min(1, "Nama universitas wajib diisi"),
  active: z.boolean(),
});

export const adminManageUniversitiesSchema = z.object({
  list: z.array(universityEntrySchema).min(1, "Minimal satu universitas wajib ada"),
});
export type AdminManageUniversitiesInput = z.infer<typeof adminManageUniversitiesSchema>;

/** `adminUpdatePaymentConfig`. */
export const adminUpdatePaymentConfigSchema = z.object({
  payment_label: z.string().min(1, "Label pembayaran wajib diisi"),
});
export type AdminUpdatePaymentConfigInput = z.infer<typeof adminUpdatePaymentConfigSchema>;

/** `config/system` admin updates. */
export const adminUpdateSystemConfigSchema = z.object({
  reservation_ttl_minutes: z.number().int().positive().optional(),
  max_active_reservations_per_session: z.number().int().positive().optional(),
  proof_max_size_mb: z.number().int().positive().optional(),
  reservations_paused: z.boolean().optional(),
});
export type AdminUpdateSystemConfigInput = z.infer<typeof adminUpdateSystemConfigSchema>;
