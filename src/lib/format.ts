import { AppError } from "./errors";

/**
 * Phone normalisation (C5 / DATA_MODEL.md): accepts `08...`, `+628...`,
 * `628...`, with optional spaces/hyphens, and stores E.164 (`+628...`).
 * Display always renders the `08...` form students expect, regardless of
 * how it was originally entered or how it's stored.
 */
export function normalizePhone(input: string): string {
  const digitsOnly = input.replace(/[\s-]/g, "").replace(/^\+/, "");

  let national: string;
  if (digitsOnly.startsWith("62")) {
    national = `0${digitsOnly.slice(2)}`;
  } else if (digitsOnly.startsWith("0")) {
    national = digitsOnly;
  } else if (digitsOnly.startsWith("8")) {
    // `PhoneField` renders a fixed, non-removable "+62" affordance, so
    // typing right after it (as the UI invites) produces just the national
    // significant number with no leading 0 or 62 at all, e.g. "812...".
    national = `0${digitsOnly}`;
  } else {
    throw new AppError(
      "VALIDATION_FAILED",
      "Nomor WhatsApp harus diawali 08 atau +62.",
      "whatsapp",
    );
  }

  if (!/^08\d{8,11}$/.test(national)) {
    throw new AppError(
      "VALIDATION_FAILED",
      "Nomor WhatsApp harus 10-13 digit dan diawali 08.",
      "whatsapp",
    );
  }

  return `+62${national.slice(1)}`;
}

/** E.164 (`+628...`) -> display form (`08...`), the inverse of storage. */
export function formatPhoneForDisplay(e164: string): string {
  if (!e164.startsWith("+62")) {
    return e164;
  }
  return `0${e164.slice(3)}`;
}

/** `100000` -> `Rp 100.000` — id-ID locale, no decimal places (IDR has none). */
export function formatCurrencyIDR(amountInRupiah: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amountInRupiah);
}

/** Server timestamps rendered in Asia/Jakarta, id-ID locale, for display. */
export function formatDateTimeJakarta(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

/** Groups a raw digit string into `0811 - 1234 - 5678`-style display, per DESIGN.md. */
export function formatNumberGrouped(digitsOnly: string): string {
  const groups = digitsOnly.match(/.{1,4}/g) ?? [digitsOnly];
  return groups.join(" - ");
}
