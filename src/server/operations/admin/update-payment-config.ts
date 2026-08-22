import { AppError } from "@/lib/errors";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { withTransaction } from "@/server/db/client";
import { writeAuditLog } from "@/server/framework/audit-log";
import type { AdminContext } from "@/server/framework/handler";
import { reencodeImage } from "@/server/storage/reencode-image";
import { configRepository, ConfigRepository } from "@/server/repositories/config-repository";

const BUCKET = "payment-assets";
const MAX_BYTES = 5 * 1024 * 1024;

export interface AdminUpdatePaymentConfigInput {
  payment_label: string;
  /** Present only when the admin is also replacing the QRIS image. */
  qrImage?: File;
  /** Required (and must be `true`) whenever `qrImage` is present. */
  scanConfirmed: boolean;
}

/**
 * `adminUpdatePaymentConfig` (B111, OQ-6). The QRIS image is the one
 * asset every payment in the system depends on, so two things are
 * non-negotiable: it runs through the exact same untrusted-file pipeline
 * as payment proofs (`reencodeImage`, shared with `upload-proof.ts`), and
 * an admin must explicitly confirm they've scanned the *new* code before
 * it goes live — a broken QRIS silently breaks every payment until a
 * student complains. Each upload gets a fresh, timestamped path; nothing
 * is ever overwritten, so the previous QRIS stays retrievable for
 * rollback (an admin can always paste the old path back in).
 */
export async function adminUpdatePaymentConfig(
  input: AdminUpdatePaymentConfigInput,
  actor: AdminContext,
  deps: { config: ConfigRepository },
) {
  const existing = await deps.config.getPayment();

  let qrImagePath = existing?.qr_image_path ?? null;
  if (input.qrImage) {
    if (!input.scanConfirmed) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Konfirmasikan bahwa Anda telah memindai kode QR baru sebelum menyimpannya.",
        "scanConfirmed",
      );
    }
    if (input.qrImage.size > MAX_BYTES) {
      throw new AppError("FILE_TOO_LARGE", "Ukuran berkas maksimal 5MB.");
    }
    const buffer = Buffer.from(await input.qrImage.arrayBuffer());
    const reencoded = await reencodeImage(buffer, input.qrImage.type, input.qrImage.name);
    const path = `admin-uploads/qris-${Date.now()}.${reencoded.extension}`;
    const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, reencoded.buffer, {
      contentType: reencoded.type,
      upsert: false,
    });
    if (error) {
      throw new AppError("INTERNAL", "Gagal mengunggah gambar QRIS.");
    }
    qrImagePath = path;
  }

  if (!qrImagePath) {
    throw new AppError(
      "VALIDATION_FAILED",
      "Belum ada gambar QRIS. Unggah gambar QRIS terlebih dahulu.",
      "qrImage",
    );
  }

  const after = { qr_image_path: qrImagePath, payment_label: input.payment_label };

  await withTransaction(async (tx) => {
    await deps.config.setPayment(after, tx);
    await writeAuditLog(tx, {
      actor_uid: actor.uid,
      actor_role: actor.role,
      action: "adminUpdatePaymentConfig",
      entity_type: "config",
      entity_id: "payment",
      before: existing
        ? { qr_image_path: existing.qr_image_path, payment_label: existing.payment_label }
        : null,
      after,
      reason: null,
    });
  });

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(qrImagePath);
  return { qr_image_url: data.publicUrl, payment_label: after.payment_label };
}

export function createAdminUpdatePaymentConfigDeps() {
  return { config: configRepository };
}
