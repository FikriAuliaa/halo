import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const DIR = path.join(process.cwd(), "e2e", "fixtures", ".generated");

function ensureDir(): void {
  mkdirSync(DIR, { recursive: true });
}

/** A real, valid JPEG — decodable, so it survives `uploadProof`'s
 * sniff-validate-decode-re-encode pipeline (scenario G). */
export async function validJpegPath(): Promise<string> {
  ensureDir();
  const file = path.join(DIR, "valid-proof.jpg");
  await sharp({
    create: { width: 40, height: 40, channels: 3, background: { r: 10, g: 200, b: 80 } },
  })
    .jpeg()
    .toFile(file);
  return file;
}

/** A polyglot: a real JPEG header (so a naive extension/magic-byte-only
 * check would accept it) with an HTML/script payload appended after the
 * image data (scenario F — proves the *server* rejects what a client
 * check alone might not catch, since decode-then-re-encode is the real
 * control, not the sniff). */
export async function polyglotJpegPath(): Promise<string> {
  ensureDir();
  const file = path.join(DIR, "polyglot.jpg");
  const jpeg = await sharp({
    create: { width: 20, height: 20, channels: 3, background: { r: 200, g: 10, b: 10 } },
  })
    .jpeg()
    .toBuffer();
  const payload = Buffer.from("<script>alert('polyglot')</script>");
  writeFileSync(file, Buffer.concat([jpeg, payload]));
  return file;
}

/** Plainly not an image at all — text with a `.jpg` extension, magic
 * bytes mismatched. */
export function notAnImagePath(): string {
  ensureDir();
  const file = path.join(DIR, "not-an-image.jpg");
  writeFileSync(file, "this is not an image, just text pretending to be one");
  return file;
}
