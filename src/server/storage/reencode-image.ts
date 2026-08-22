import sharp from "sharp";
import { AppError } from "@/lib/errors";
import { validateImage, type SniffedImageType } from "./validate-image";

const DECODE_TIMEOUT_MS = 10_000;
const MAX_DIMENSION = 4000;

const EXTENSION_BY_TYPE: Record<SniffedImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Image processing timed out")), ms);
    }),
  ]);
}

export interface ReencodedImage {
  buffer: Buffer;
  type: SniffedImageType;
  extension: string;
}

/**
 * Shared by `upload-proof.ts` (B083) and `update-payment-config.ts`
 * (B111) — any admin- or student-supplied image is untrusted, so both
 * paths sniff, validate, and unconditionally decode-then-**re-encode**
 * with `sharp` (never merely re-save). Re-encoding, not the sniff, is
 * what actually destroys a polyglot payload appended after a valid image
 * header and strips EXIF/ICC/GPS. `limitInputPixels` defaults to ~268M
 * px, sharp's own decompression-bomb guard; `withTimeout` is defense in
 * depth on top.
 */
export async function reencodeImage(
  buffer: Buffer,
  declaredMimeType: string,
  filename: string,
): Promise<ReencodedImage> {
  const validated = validateImage(buffer, declaredMimeType, filename);
  if (!validated.ok) {
    throw new AppError("INVALID_FILE_TYPE", validated.reason);
  }

  try {
    const pipeline = sharp(buffer)
      // Applies EXIF orientation to the actual pixels before the EXIF
      // block itself is discarded — otherwise a "correctly" rotated
      // photo would appear sideways once metadata is gone.
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      });
    // No `.withMetadata()` call: sharp strips EXIF/ICC/GPS by default on
    // re-encode.
    const reencoded = await withTimeout(
      validated.type === "image/png"
        ? pipeline.png().toBuffer()
        : validated.type === "image/webp"
          ? pipeline.webp().toBuffer()
          : pipeline.jpeg().toBuffer(),
      DECODE_TIMEOUT_MS,
    );
    return {
      buffer: reencoded,
      type: validated.type,
      extension: EXTENSION_BY_TYPE[validated.type],
    };
  } catch {
    throw new AppError(
      "INVALID_FILE_TYPE",
      "Gambar tidak dapat diproses. Coba unggah ulang dengan berkas lain.",
    );
  }
}
