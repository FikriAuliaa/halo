import type { AdminRole } from "@/schemas/admin";

/**
 * The admin permission matrix (B096) — the single source of truth for
 * which role an operation requires, imported by both server enforcement
 * (`createHandler`'s `requireRole`, on every `/api/admin/*` route) and
 * client rendering (`<RoleGate>`, hiding actions a role can't perform).
 * One module, so the two can never drift. Per spec: `ADMIN_TELKOMSEL`
 * additionally holds offline-sales visibility and the destructive powers
 * (force-release, order status override, admin account management).
 *
 * Hiding an action client-side is UX only — every operation listed here
 * is *independently* enforced server-side regardless of what the client
 * renders; a hidden action called directly is refused exactly the same
 * as a visible one would be for the wrong role.
 */
export type AdminOperation =
  | "adminListNumbers"
  | "adminAddNumbers"
  | "adminRemoveNumber"
  | "adminUpdateNumber"
  | "adminMarkSoldOffline"
  | "adminRunCleanup"
  | "adminForceReleaseReservation"
  | "adminListOrders"
  | "adminGetOrder"
  | "adminGetProofUrl"
  | "adminVerifyPayment"
  | "adminRejectPayment"
  | "adminOverrideOrderStatus"
  | "adminManagePackages"
  | "adminConfirmPackagePrice"
  | "adminManageUniversities"
  | "adminUpdatePaymentConfig"
  | "adminUpdateSystemConfig"
  | "adminManageAdmins";

export type RequiredRole = AdminRole | "any";

export const ADMIN_PERMISSIONS: Record<AdminOperation, RequiredRole> = {
  adminListNumbers: "any",
  adminAddNumbers: "any",
  adminRemoveNumber: "any",
  adminUpdateNumber: "any",
  // Offline-sales visibility/marking is a Telkomsel-specific capability
  // (spec §5) — the write side of the same concern.
  adminMarkSoldOffline: "ADMIN_TELKOMSEL",
  adminRunCleanup: "ADMIN_TELKOMSEL",
  adminForceReleaseReservation: "ADMIN_TELKOMSEL",
  adminListOrders: "any",
  adminGetOrder: "any",
  adminGetProofUrl: "any",
  adminVerifyPayment: "any",
  adminRejectPayment: "any",
  // Manual, non-standard correction path for a wrongly-verified order
  // (RUNBOOK.md §3) — deliberately not the same code path as
  // verify/reject, and deliberately restricted to the higher role.
  adminOverrideOrderStatus: "ADMIN_TELKOMSEL",
  // Editing metadata/reordering/toggling active is "any" — only the
  // price and price-confirmation sub-actions are Telkomsel-restricted,
  // enforced inside `adminManagePackages` itself (B110) since the route
  // permission can't express a per-field rule.
  adminManagePackages: "any",
  adminConfirmPackagePrice: "ADMIN_TELKOMSEL",
  adminManageUniversities: "any",
  // B111: "Only ADMIN_TELKOMSEL may change payment configuration" —
  // corrected from the earlier placeholder value of "any" set before
  // this operation's constraints were implemented.
  adminUpdatePaymentConfig: "ADMIN_TELKOMSEL",
  adminUpdateSystemConfig: "ADMIN_TELKOMSEL",
  adminManageAdmins: "ADMIN_TELKOMSEL",
};

export function canPerform(role: AdminRole, operation: AdminOperation): boolean {
  const required = ADMIN_PERMISSIONS[operation];
  return required === "any" || required === role;
}
