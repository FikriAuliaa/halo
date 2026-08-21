import {
  NUMBER_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  type NumberStatus,
  type OrderStatus,
} from "@/domain/status";
import { Badge, type BadgeVariant } from "./badge";

// One mapping, imported everywhere a status renders (B037) — DESIGN.md §10:
// available -> outline only, reserved -> orange (active), pending -> orange
// (active/in-review), sold -> red (primary-container fill), sold_offline
// -> neutral/muted (informational, not actionable).
const NUMBER_STATUS_VARIANT: Record<NumberStatus, BadgeVariant> = {
  available: "outline",
  reserved: "orange",
  pending: "orange",
  sold: "red",
  sold_offline: "neutral",
};

const ORDER_STATUS_VARIANT: Record<OrderStatus, BadgeVariant> = {
  pending: "orange",
  verified: "red",
  rejected: "neutral",
};

export function NumberStatusBadge({ status }: { status: NumberStatus }) {
  return <Badge variant={NUMBER_STATUS_VARIANT[status]}>{NUMBER_STATUS_LABELS[status]}</Badge>;
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={ORDER_STATUS_VARIANT[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
}
