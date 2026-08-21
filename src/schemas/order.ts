import { z } from "zod";
import {
  emailSchema,
  fullNameSchema,
  numberIdSchema,
  orderRefSchema,
  packageIdSchema,
  phoneSchema,
  trackingTokenSchema,
} from "./common";

/**
 * The four fields actually collected on the personal-data screen
 * (`/data`) — package selection happens on an earlier screen and is
 * tracked separately via `flow-state.ts`, never part of this form's own
 * draft. Validating that screen against the full `orderFormSchema`
 * below (which requires `package_id`) is a bug found live via E2E
 * testing (B119/Scenario A): `package_id` is never present in the
 * `/data` draft, so a full-schema `safeParse` there always failed
 * silently — no student could ever click past that screen, and the
 * resulting error was for a field this screen doesn't even render, so
 * nothing visible ever explained why.
 */
export const personalDataFormSchema = z.object({
  full_name: fullNameSchema,
  university: z.string().min(1, "Universitas wajib dipilih"),
  whatsapp: phoneSchema,
  email: emailSchema,
});
export type PersonalDataFormInput = z.infer<typeof personalDataFormSchema>;

/** The full order form (personal data + package) — REQ-010/REQ-022,
 * used by `submitOrder`/`POST /api/orders`, where `package_id` really
 * is known (read from `flow-state.ts` on the payment screen). */
export const orderFormSchema = personalDataFormSchema.extend({
  package_id: packageIdSchema,
});
export type OrderFormInput = z.infer<typeof orderFormSchema>;

/** `submitOrder` — the order form plus the reservation session context. */
export const submitOrderSchema = orderFormSchema.extend({
  idempotency_key: z.string().min(1),
});
export type SubmitOrderInput = z.infer<typeof submitOrderSchema>;

/** `getTrackingStatus` — ADR-005: both halves of the pair are required. */
export const trackingLookupSchema = z.object({
  order_ref: orderRefSchema,
  tracking_token: trackingTokenSchema,
});
export type TrackingLookupInput = z.infer<typeof trackingLookupSchema>;

/** `adminRejectPayment` — a rejection reason is mandatory (API_SPEC.md).
 * Idempotency-keyed (B104) — two admins racing the same order, or a
 * retried click, must produce exactly one outcome. */
export const adminRejectPaymentSchema = z.object({
  admin_note: z.string().min(1, "Alasan penolakan wajib diisi"),
  idempotency_key: z.string().min(1),
});
export type AdminRejectPaymentInput = z.infer<typeof adminRejectPaymentSchema>;

/** `adminVerifyPayment` — no note required, but an optional one is allowed. */
export const adminVerifyPaymentSchema = z.object({
  admin_note: z.string().optional(),
  idempotency_key: z.string().min(1),
});
export type AdminVerifyPaymentInput = z.infer<typeof adminVerifyPaymentSchema>;

/** `adminListOrders` query parameters (B101). Offset-paginated (`page`),
 * not cursor-based — see `OrderRepository.list`'s doc comment for why an
 * admin-only, arbitrary-sort-field table view doesn't need the stricter
 * keyset guarantee the public number-listing endpoints do. */
export const adminListOrdersQuerySchema = z.object({
  status: z.enum(["pending", "verified", "rejected"]).optional(),
  university: z.string().optional(),
  package_id: z.string().optional(),
  submitted_from: z.coerce.date().optional(),
  submitted_to: z.coerce.date().optional(),
  search: z.string().max(100).optional(),
  sort_field: z.enum(["submitted_at", "verified_at", "full_name"]).default("submitted_at"),
  sort_direction: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});
export type AdminListOrdersQuery = z.infer<typeof adminListOrdersQuerySchema>;

export const numberIdParamSchema = z.object({ id: numberIdSchema });
