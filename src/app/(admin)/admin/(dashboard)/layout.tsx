import { AdminShell } from "@/components/admin/admin-shell";
import { ToastProvider } from "@/components/ui/toast-provider";
import { requireAdmin } from "@/server/guards/require-admin";

/**
 * `useToast()` throws if called outside a `ToastProvider` — every admin
 * screen that shows a success/error toast (order verify/reject, number
 * actions, package/payment config) needs one somewhere above it in the
 * tree, the same way `(student)/layout.tsx` provides one for the
 * student flow. This was missing here entirely until found live: every
 * page under this layout that calls `useToast()` unconditionally at
 * render time (not just when a toast actually fires) crashed with a
 * 500 — undetected through Phases 10-13 because verification there was
 * API-route-only (`curl`), never an actual page render in a browser.
 * Found by Phase 15's real Playwright/axe pass.
 */
export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <ToastProvider>
      <AdminShell role={admin.role} email={admin.email ?? admin.uid}>
        {children}
      </AdminShell>
    </ToastProvider>
  );
}
