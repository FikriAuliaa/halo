import { randomUUID } from "node:crypto";
import { AppError } from "@/lib/errors";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { reencodeImage } from "./reencode-image";

const MAX_BYTES = 5 * 1024 * 1024;
const BUCKET = "proofs";

/**
 * The payment-proof upload pipeline (B083) — accepts an untrusted image
 * from an unauthenticated student. Order of operations matters: the size
 * cap is enforced before the whole body is held in memory as far as the
 * platform allows (`Content-Length` pre-check at the route, then a
 * re-check on the actual buffer here — Next.js Route Handlers don't
 * expose a lower-level streaming multipart parser without a bespoke
 * dependency, so this is the practical ceiling on "before full
 * buffering," not a guarantee against a body that lies about its own
 * length); `reencodeImage` (shared with `update-payment-config.ts`,
 * B111) handles the sniff-validate-decode-re-encode pipeline itself.
 */
export async function uploadProof(file: File, orderId: string): Promise<{ path: string }> {
  if (file.size > MAX_BYTES) {
    throw new AppError("FILE_TOO_LARGE", "Ukuran berkas maksimal 5MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_BYTES) {
    throw new AppError("FILE_TOO_LARGE", "Ukuran berkas maksimal 5MB.");
  }

  const reencoded = await reencodeImage(buffer, file.type, file.name);

  const path = `${orderId}/${randomUUID()}.${reencoded.extension}`;
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, reencoded.buffer, {
    contentType: reencoded.type,
    upsert: false,
  });
  if (error) {
    throw new AppError("INTERNAL", "Gagal mengunggah bukti pembayaran.");
  }

  return { path: `${BUCKET}/${path}` };
}
