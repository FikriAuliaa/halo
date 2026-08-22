import { AppError } from "@/lib/errors";
import { adminUpdatePaymentConfigSchema } from "@/schemas/config";
import { ADMIN_PERMISSIONS } from "@/domain/permissions";
import { createHandler } from "@/server/framework/handler";
import { configRepository } from "@/server/repositories/config-repository";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  adminUpdatePaymentConfig,
  createAdminUpdatePaymentConfigDeps,
} from "@/server/operations/admin/update-payment-config";

const BUCKET = "payment-assets";

/** `GET /api/admin/config/payment` (B111) — current label plus a public
 * URL for the live QRIS image, so the admin screen can show it inline.
 * Viewing is open to any admin role — the same data is already public
 * via `getPaymentConfig` (B081); only *changing* it (`POST`, below) is
 * `ADMIN_TELKOMSEL`-only. */
export const GET = createHandler({ requireRole: "any" }, async () => {
  const doc = await configRepository.getPayment();
  if (!doc) return { qr_image_url: null, payment_label: null };
  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(doc.qr_image_path);
  return { qr_image_url: data.publicUrl, payment_label: doc.payment_label };
});

/**
 * `POST /api/admin/config/payment` (B111) — multipart/form-data, like
 * `POST /api/orders`, since the QRIS image is optional per request (a
 * label-only edit needs no file at all).
 */
export const POST = createHandler(
  { requireRole: ADMIN_PERMISSIONS.adminUpdatePaymentConfig },
  async ({ request, admin }) => {
    if (!admin) throw new AppError("UNAUTHENTICATED", "Autentikasi diperlukan.");

    const formData = await request.formData();
    const parsed = adminUpdatePaymentConfigSchema.safeParse({
      payment_label: formData.get("payment_label"),
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path[0];
      throw new AppError(
        "VALIDATION_FAILED",
        issue?.message ?? "Data tidak valid.",
        typeof field === "string" ? field : null,
      );
    }

    const qrImage = formData.get("qr_image");
    const scanConfirmed = formData.get("scan_confirmed") === "true";

    return adminUpdatePaymentConfig(
      {
        payment_label: parsed.data.payment_label,
        ...(qrImage instanceof File ? { qrImage } : {}),
        scanConfirmed,
      },
      admin,
      createAdminUpdatePaymentConfigDeps(),
    );
  },
);
