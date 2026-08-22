/**
 * Normalisation and validation for **Halo SIM numbers** — the `numbers`
 * collection's document ID (DATA_MODEL.md, spec §8.1). Canonical storage
 * form is `08...`, not E.164, because the number itself *is* the document
 * ID and must match the seed dataset's own format exactly (C5, B055).
 *
 * This is a different concern from the student's **WhatsApp contact
 * number** on the order form, which has its own normaliser in
 * `src/lib/format.ts` and a different canonical form (E.164, `+628...`) —
 * a contact number is metadata about the order; a Halo number is the
 * inventory item itself. Do not use one normaliser for the other's field.
 */

const MIN_DIGITS = 10;
const MAX_DIGITS = 13;

/**
 * Strips everything that isn't meaningful to the number itself — spaces,
 * hyphens, parentheses, and Unicode whitespace including non-breaking
 * space (U+00A0), which phones/OSes routinely insert when a number is
 * copied from a contacts app or a messaging client.
 */
function stripFormatting(input: string): string {
  return input.replace(/[\s \-()]/g, "");
}

export interface PhoneNormalizationResult {
  ok: boolean;
  value: string | null;
  reason: string | null;
}

/**
 * Accepts `08...`, `+628...`, `628...` (with spaces/hyphens/parens/NBSP),
 * returns the canonical `08...` form. Normalisation is total: every input
 * either normalises or is rejected with a specific reason — it never
 * silently returns something merely plausible (B055).
 */
export function normalizePhone(input: string): PhoneNormalizationResult {
  const stripped = stripFormatting(input);

  if (stripped.length === 0) {
    return { ok: false, value: null, reason: "Nomor tidak boleh kosong." };
  }

  let national: string;
  if (stripped.startsWith("+62")) {
    national = `0${stripped.slice(3)}`;
  } else if (stripped.startsWith("62")) {
    national = `0${stripped.slice(2)}`;
  } else if (stripped.startsWith("0")) {
    national = stripped;
  } else {
    return {
      ok: false,
      value: null,
      reason: "Nomor harus diawali 08, 62, atau +62.",
    };
  }

  if (!/^\d+$/.test(national)) {
    return { ok: false, value: null, reason: "Nomor hanya boleh berisi angka." };
  }

  if (national.length < MIN_DIGITS || national.length > MAX_DIGITS) {
    return {
      ok: false,
      value: null,
      reason: `Nomor harus terdiri dari ${MIN_DIGITS}-${MAX_DIGITS} digit.`,
    };
  }

  if (!national.startsWith("08")) {
    return { ok: false, value: null, reason: "Nomor harus diawali 08 setelah dinormalisasi." };
  }

  return { ok: true, value: national, reason: null };
}

export function isValidIndonesianMobile(input: string): boolean {
  return normalizePhone(input).ok;
}

/** `081125154044` -> `0811 - 2515 - 4044`, matching the reference exactly. */
export function formatPhoneDisplay(canonical: string): string {
  const groups = canonical.match(/.{1,4}/g) ?? [canonical];
  return groups.join(" - ");
}

/** The canonical form itself, with no grouping — for search/comparison/storage. */
export function formatPhoneCompact(canonical: string): string {
  return canonical;
}
