/**
 * Magic-byte sniffing (B083). Extension checking alone is theatre; magic
 * bytes alone still admit a polyglot file that's simultaneously a valid
 * image and a valid script — the real control is `upload-proof.ts`'s
 * decode-then-re-encode step, which destroys any payload smuggled after a
 * valid image header. This module only decides whether to bother trying.
 */

export type SniffedImageType = "image/jpeg" | "image/png" | "image/webp";

const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function startsWith(buffer: Buffer, magic: number[]): boolean {
  if (buffer.length < magic.length) return false;
  return magic.every((byte, i) => buffer[i] === byte);
}

export function sniffImageType(buffer: Buffer): SniffedImageType | null {
  if (startsWith(buffer, JPEG_MAGIC)) return "image/jpeg";
  if (startsWith(buffer, PNG_MAGIC)) return "image/png";
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

const EXTENSIONS_BY_TYPE: Record<SniffedImageType, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
};

export type ValidateImageResult =
  { ok: true; type: SniffedImageType } | { ok: false; reason: string };

/** Cross-checks sniffed content, declared MIME type, and file extension —
 * a mismatch on any axis is rejected, never trusted for anything
 * security-relevant on its own (AGENTS.md). */
export function validateImage(
  buffer: Buffer,
  declaredMimeType: string,
  filename: string,
): ValidateImageResult {
  const sniffed = sniffImageType(buffer);
  if (!sniffed) {
    return { ok: false, reason: "Berkas bukan gambar JPEG, PNG, atau WEBP yang valid." };
  }
  if (declaredMimeType !== sniffed) {
    return { ok: false, reason: "Tipe berkas tidak sesuai dengan isi berkas." };
  }
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  if (!EXTENSIONS_BY_TYPE[sniffed].includes(extension)) {
    return { ok: false, reason: "Ekstensi berkas tidak sesuai dengan isi berkas." };
  }
  return { ok: true, type: sniffed };
}
