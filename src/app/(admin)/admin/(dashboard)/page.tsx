import Link from "next/link";
import { MetricCard } from "@/components/admin/metric-card";
import { AlertsPanel } from "@/components/admin/alerts-panel";
import { OrderStatusBadge } from "@/components/ui/status-badge";
import { formatDateTimeJakarta } from "@/lib/format";
import { formatPhoneDisplay } from "@/domain/phone";
import { adminGetDashboardMetrics } from "@/server/operations/admin/dashboard-metrics";

export default async function AdminDashboardPage() {
  const metrics = await adminGetDashboardMetrics();

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-headline-lg text-on-surface">Dashboard</h1>
        <span className="font-body text-body-sm text-on-surface-variant">
          Diperbarui {formatDateTimeJakarta(new Date(metrics.generated_at))}
        </span>
      </div>

      <AlertsPanel
        stalePendingOrders={metrics.alerts.stale_pending_orders}
        cleanupJobStale={metrics.alerts.cleanup_job_stale}
        cleanupJobLastRunMinutesAgo={metrics.alerts.cleanup_job_last_run_minutes_ago}
      />

      <div className="grid grid-cols-2 gap-sm md:grid-cols-3">
        <MetricCard label="Menunggu Verifikasi" value={metrics.orders_pending} primary />
        <MetricCard label="Diverifikasi Hari Ini" value={metrics.orders_verified_today} />
        <MetricCard label="Ditolak Hari Ini" value={metrics.orders_rejected_today} />
        <MetricCard label="Nomor Tersedia" value={metrics.numbers.available} />
        <MetricCard label="Nomor Direservasi" value={metrics.numbers.reserved} />
        <MetricCard
          label="Nomor Terjual"
          value={metrics.numbers.sold + metrics.numbers.sold_offline}
        />
      </div>

      <div className="flex flex-col gap-sm">
        <h2 className="font-display text-title-md text-on-surface">Pesanan Terbaru</h2>
        <div className="overflow-x-auto rounded-card border border-outline-variant">
          <table className="w-full text-left">
            <thead className="bg-surface-container-high">
              <tr>
                <th
                  scope="col"
                  className="px-sm py-sm font-body text-body-sm text-on-surface-variant"
                >
                  Referensi
                </th>
                <th
                  scope="col"
                  className="px-sm py-sm font-body text-body-sm text-on-surface-variant"
                >
                  Nomor
                </th>
                <th
                  scope="col"
                  className="px-sm py-sm font-body text-body-sm text-on-surface-variant"
                >
                  Nama
                </th>
                <th
                  scope="col"
                  className="px-sm py-sm font-body text-body-sm text-on-surface-variant"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-sm py-sm font-body text-body-sm text-on-surface-variant"
                >
                  Diajukan
                </th>
              </tr>
            </thead>
            <tbody>
              {metrics.recent_orders.map((order) => (
                <tr key={order.id} className="border-t border-outline-variant">
                  <td className="px-sm py-sm">
                    <Link
                      href={`/admin/pesanan/${order.id}`}
                      className="font-body text-body-sm text-secondary"
                    >
                      {order.order_ref}
                    </Link>
                  </td>
                  <td className="px-sm py-sm font-body text-body-sm text-on-surface">
                    {formatPhoneDisplay(order.number)}
                  </td>
                  <td className="px-sm py-sm font-body text-body-sm text-on-surface">
                    {order.full_name}
                  </td>
                  <td className="px-sm py-sm">
                    <OrderStatusBadge
                      status={order.status as "pending" | "verified" | "rejected"}
                    />
                  </td>
                  <td className="px-sm py-sm font-body text-body-sm text-on-surface-variant">
                    {formatDateTimeJakarta(new Date(order.submitted_at))}
                  </td>
                </tr>
              ))}
              {metrics.recent_orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-sm py-md text-center font-body text-body-sm text-on-surface-variant"
                  >
                    Belum ada pesanan.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
