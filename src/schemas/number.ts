import { z } from "zod";
import { numberIdSchema } from "./common";

/** `adminAddNumbers` — single or bulk paste, one number per line. */
export const adminAddNumbersSchema = z.object({
  numbers: z
    .array(z.string())
    .min(1, "Masukkan minimal satu nomor")
    .max(200, "Maksimal 200 nomor per permintaan"),
});
export type AdminAddNumbersInput = z.infer<typeof adminAddNumbersSchema>;

/** A single number, once split from the bulk-paste textarea and trimmed. */
export const rawNumberEntrySchema = numberIdSchema;

/** `adminListNumbers` query parameters (B106) — offset-paginated with
 * sort, like `adminListOrdersQuerySchema`; see `NumberRepository.list`'s
 * doc comment for why this admin-only view doesn't use keyset paging. */
export const adminListNumbersQuerySchema = z.object({
  status: z.enum(["available", "reserved", "pending", "sold", "sold_offline"]).optional(),
  search: z.string().regex(/^\d*$/, "Hanya boleh berisi angka").max(13).optional(),
  sort_field: z.enum(["number", "updated_at", "sold_at"]).default("updated_at"),
  sort_direction: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});
export type AdminListNumbersQuery = z.infer<typeof adminListNumbersQuerySchema>;

/**
 * `adminUpdateNumber` — a narrow correction, never a status-transition
 * shortcut (B058). Since the phone number *is* the document ID
 * (DATA_MODEL.md), supplying `number` renames the document (permitted
 * only while the original has never been reserved); omitting it records
 * `reason` as an audited annotation with no field change. Either way,
 * `status` itself is never touched — use the dedicated
 * verify/reject/mark-offline operations for that.
 */
export const adminUpdateNumberSchema = z.object({
  reason: z.string().min(1, "Alasan perubahan wajib diisi"),
  number: numberIdSchema.optional(),
});
export type AdminUpdateNumberInput = z.infer<typeof adminUpdateNumberSchema>;

/** `getAvailableNumbers` query parameters (student-facing, public). A
 * query string with exactly one `exclude=...` produces a bare string,
 * not a one-element array — `URLSearchParams`/`createHandler`'s parser
 * has no way to know this field is array-shaped from the wire format
 * alone, so the schema normalizes it here instead of assuming the
 * framework already handed back a real array. */
export const getAvailableNumbersQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(12),
  suffix: z.string().regex(/^\d*$/, "Hanya boleh berisi angka").max(8).optional(),
  exclude: z
    .union([numberIdSchema, z.array(numberIdSchema)])
    .transform((value) => (Array.isArray(value) ? value : [value]))
    .optional(),
});
export type GetAvailableNumbersQuery = z.infer<typeof getAvailableNumbersQuerySchema>;

/** `reserveNumber` — `POST /api/numbers/{id}/reserve` (API_SPEC.md). The
 * number itself is a URL path segment, not a body field. */
export const reserveNumberSchema = z.object({
  idempotency_key: z.string().min(1, "idempotency_key wajib diisi"),
});
export type ReserveNumberInput = z.infer<typeof reserveNumberSchema>;
