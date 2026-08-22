/**
 * The five-state number lifecycle and three-state order lifecycle, per
 * ADR-003. Defined once here — the UI's StatusBadge, the trusted-tier
 * transition validator (Phase 6), and Firestore documents (DATA_MODEL.md)
 * all reference these same string values, never a local re-declaration.
 */
export const NUMBER_STATUSES = [
  "available",
  "reserved",
  "pending",
  "sold",
  "sold_offline",
] as const;
export type NumberStatus = (typeof NUMBER_STATUSES)[number];

export const ORDER_STATUSES = ["pending", "verified", "rejected"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Indonesian labels, defined centrally (B037) — never inlined per-component. */
export const NUMBER_STATUS_LABELS: Record<NumberStatus, string> = {
  available: "Tersedia",
  reserved: "Terkunci",
  pending: "Menunggu Verifikasi",
  sold: "Terjual",
  sold_offline: "Terjual Offline",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Menunggu Verifikasi",
  verified: "Terverifikasi",
  rejected: "Ditolak",
};
