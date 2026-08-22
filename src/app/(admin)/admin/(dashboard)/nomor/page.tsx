import { requireAdmin } from "@/server/guards/require-admin";
import { NumbersPageClient } from "@/components/admin/numbers-page-client";

/**
 * `/admin/nomor` (B106). Lives under the `(dashboard)` route group, like
 * `pesanan`, so it inherits `(dashboard)/layout.tsx`'s `AdminShell`/nav —
 * the block spec's own file path predates that grouping decision.
 *
 * A thin server wrapper: row actions (`NumberActions`) are role-gated
 * client-side for UX, which needs the admin's role as a prop — the same
 * reason the layout itself fetches it via `requireAdmin()` for
 * `AdminShell`. The rest of the page is fully interactive (filters,
 * sort, pagination, dialogs), so it lives in a client component.
 */
export default async function NumbersPage() {
  const admin = await requireAdmin();
  return <NumbersPageClient role={admin.role} />;
}
