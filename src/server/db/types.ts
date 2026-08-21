import type { NumberStatus, OrderStatus } from "@/domain/status";
import type { AdminRole } from "@/schemas/admin";

/**
 * Row shapes for the trusted tier's Postgres tables (replaces the old
 * `src/server/firestore/converters.ts`). `postgres.js` already parses
 * `timestamptz` into `Date` and `jsonb` into plain objects, so — unlike
 * Firestore's `Timestamp` — no conversion layer is needed here; these are
 * plain structural types over what a query already returns.
 */

export interface NumberRow {
  number: string;
  status: NumberStatus;
  reserved_at: Date | null;
  reserved_until: Date | null;
  session_id: string | null;
  reservation_id: string | null;
  order_ref: string | null;
  tracking_token_hash: string | null;
  sold_at: Date | null;
  sold_channel: "online" | "offline" | null;
  updated_at: Date;
}

export interface OrderRow {
  id: string;
  number: string;
  order_ref: string;
  tracking_token_hash: string;
  session_id: string;
  full_name: string;
  university: string;
  whatsapp: string;
  email: string;
  package_id: string;
  payment_proof_path: string;
  status: OrderStatus;
  submitted_at: Date;
  verified_at: Date | null;
  verified_by: string | null;
  admin_note: string | null;
  price_at_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface SessionRow {
  id: string;
  created_at: Date;
  last_seen_at: Date;
  current_reservation: { number: string; reservation_id: string } | null;
}

export interface PackageEntry {
  id: string;
  label: string;
  price: number;
  price_status: "draft" | "confirmed";
  quota_internet_gb: number;
  quota_roaming_gb: number;
  voice_minutes: number;
  sms_count: number;
  recommended: boolean;
  active: boolean;
  display_order: number;
}

export interface PaymentConfigDoc {
  qr_image_path: string;
  payment_label: string;
  updated_at: Date;
}

export interface PackagesConfigDoc {
  packages: PackageEntry[];
  updated_at: Date;
}

export interface UniversitiesConfigDoc {
  list: Array<{ name: string; active: boolean }>;
  updated_at: Date;
}

export interface SystemConfigDoc {
  reservation_ttl_minutes: number;
  max_active_reservations_per_session: number;
  proof_max_size_mb: number;
  proof_allowed_mime_types: string[];
  reservations_paused: boolean;
  updated_at: Date;
}

export interface AuditLogRow {
  id: string;
  actor_uid: string;
  actor_role: AdminRole;
  action: string;
  entity_type: string;
  entity_id: string;
  before: unknown;
  after: unknown;
  reason: string | null;
  created_at: Date;
}
