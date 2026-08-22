import { AppError } from "@/lib/errors";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { configRepository } from "@/server/repositories/config-repository";

export interface GetPaymentConfigResult {
  qr_image_url: string;
  payment_label: string;
}

const BUCKET = "payment-assets";

/** `getPaymentConfig` (B081) — missing config is an explicit, actionable
 * error, never a silently broken image. The QRIS image lives in a public
 * bucket (unlike payment proofs — this is meant to be visible to anyone,
 * so a plain public URL is correct here, not a signed one). */
export async function getPaymentConfig(): Promise<GetPaymentConfigResult> {
  const config = await configRepository.getPayment();
  if (!config) {
    throw new AppError("NOT_FOUND", "Konfigurasi pembayaran belum tersedia.");
  }
  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(config.qr_image_path);
  return { qr_image_url: data.publicUrl, payment_label: config.payment_label };
}
