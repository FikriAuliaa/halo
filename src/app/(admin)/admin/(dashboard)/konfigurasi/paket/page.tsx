import { requireAdmin } from "@/server/guards/require-admin";
import { PackagesConfigClient } from "@/components/admin/packages-config-client";

/** `/admin/konfigurasi/paket` (B110). Server wrapper for the same reason
 * `/admin/nomor` is one: price editing and price confirmation are
 * `ADMIN_TELKOMSEL`-only, which the client needs the role to gate. */
export default async function PackagesConfigPage() {
  const admin = await requireAdmin();
  return <PackagesConfigClient role={admin.role} />;
}
