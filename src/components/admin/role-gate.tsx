import type { ReactNode } from "react";
import { ADMIN_PERMISSIONS, type AdminOperation } from "@/domain/permissions";
import type { AdminRole } from "@/schemas/admin";

export interface RoleGateProps {
  role: AdminRole;
  operation: AdminOperation;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Hides an action the current role can't perform (B096) — UX only, never
 * the control. Reads the same `ADMIN_PERMISSIONS` matrix every
 * `/api/admin/*` route enforces server-side, so the two can never drift;
 * a hidden action called directly against the API is refused identically
 * to a visible one for the wrong role.
 */
export function RoleGate({ role, operation, children, fallback = null }: RoleGateProps) {
  const required = ADMIN_PERMISSIONS[operation];
  const allowed = required === "any" || required === role;
  return allowed ? <>{children}</> : <>{fallback}</>;
}
