import { requireAdmin } from "@/server/guards/require-admin";
import { PaymentConfigClient } from "@/components/admin/payment-config-client";

/** `/admin/konfigurasi/pembayaran` (B111). Server wrapper: every action
 * here is `ADMIN_TELKOMSEL`-only, which the client needs the role to
 * gate (the server independently refuses it regardless, per B096). */
export default async function PaymentConfigPage() {
  const admin = await requireAdmin();
  return <PaymentConfigClient role={admin.role} />;
}
