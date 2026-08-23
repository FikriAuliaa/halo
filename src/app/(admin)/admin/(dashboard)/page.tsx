import Link from "next/link";
import { MetricCard } from "@/components/admin/metric-card";
import { AlertsPanel } from "@/components/admin/alerts-panel";
import { formatDateTimeJakarta } from "@/lib/format";
import { formatPhoneDisplay } from "@/domain/phone";
import { adminGetDashboardMetrics } from "@/server/operations/admin/dashboard-metrics";

export default async function AdminDashboardPage() {
  const metrics = await adminGetDashboardMetrics();

  return (
    <div className="flex w-full flex-col gap-lg">
      {/* Header */}
      <div className="mb-sm flex items-center justify-between">
        <h2 className="font-display-lg text-display-lg text-on-surface">Dashboard Overview</h2>
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          Diperbarui {formatDateTimeJakarta(new Date(metrics.generated_at))}
        </span>
      </div>

      {/* System Alerts */}
      <AlertsPanel
        stalePendingOrders={metrics.alerts.stale_pending_orders}
        cleanupJobStale={metrics.alerts.cleanup_job_stale}
        cleanupJobLastRunMinutesAgo={metrics.alerts.cleanup_job_last_run_minutes_ago}
      />

      {/* Metrics Grid (Bento style) */}
      <div className="mb-xl grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Menunggu Verifikasi"
          value={metrics.orders_pending}
          icon="schedule"
          primary
        />
        <MetricCard
          label="Diverifikasi Hari Ini"
          value={metrics.orders_verified_today}
          icon="check_circle"
        />
        <MetricCard label="Ditolak Hari Ini" value={metrics.orders_rejected_today} icon="cancel" />
        <MetricCard label="Nomor Tersedia" value={metrics.numbers.available} icon="phone_in_talk" />
        <MetricCard
          label="Nomor Direservasi"
          value={metrics.numbers.reserved}
          icon="event_available"
        />
        <MetricCard
          label="Nomor Terjual"
          value={metrics.numbers.sold + metrics.numbers.sold_offline}
          icon="sell"
        />
      </div>

      {/* Data Table Section: Recent Orders */}
      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container shadow-lg">
        <div className="border-b border-outline-variant p-lg">
          <h3 className="font-title-md text-title-md text-on-surface">Pesanan Terbaru</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-high">
                <th className="font-label-bold px-lg py-sm text-label-bold uppercase tracking-wider text-on-surface-variant">
                  Phone Number
                </th>
                <th className="font-label-bold px-lg py-sm text-label-bold uppercase tracking-wider text-on-surface-variant">
                  Customer Name
                </th>
                <th className="font-label-bold px-lg py-sm text-label-bold uppercase tracking-wider text-on-surface-variant">
                  Status
                </th>
                <th className="font-label-bold px-lg py-sm text-label-bold uppercase tracking-wider text-on-surface-variant">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {metrics.recent_orders.map((order) => {
                const isVerified = order.status === "verified";
                const isPending = order.status === "pending";
                const isRejected = order.status === "rejected";

                return (
                  <tr
                    key={order.id}
                    className="transition-colors hover:bg-surface-container-highest/60"
                  >
                    <td className="font-body-sm whitespace-nowrap px-lg py-md text-on-surface">
                      <Link
                        href={`/admin/pesanan/${order.id}`}
                        className="font-title-md text-title-md text-on-surface hover:text-primary hover:underline"
                      >
                        {formatPhoneDisplay(order.number)}
                      </Link>
                    </td>
                    <td className="font-body-sm whitespace-nowrap px-lg py-md text-on-surface">
                      {order.full_name}
                    </td>
                    <td className="whitespace-nowrap px-lg py-md">
                      {isVerified ? (
                        <span className="inline-flex items-center rounded-full bg-[#1B3B24] px-2.5 py-1 text-xs font-bold text-[#81C784]">
                          Diverifikasi
                        </span>
                      ) : isPending ? (
                        <span className="inline-flex items-center rounded-full bg-[#4B3A14] px-2.5 py-1 text-xs font-bold text-[#FFD54F]">
                          Menunggu Verifikasi
                        </span>
                      ) : isRejected ? (
                        <span className="inline-flex items-center rounded-full bg-error-container px-2.5 py-1 text-xs font-bold text-error">
                          Ditolak
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-surface-container-high px-2.5 py-1 text-xs font-bold text-on-surface-variant">
                          {order.status}
                        </span>
                      )}
                    </td>
                    <td className="font-body-sm whitespace-nowrap px-lg py-md text-on-surface-variant">
                      {formatDateTimeJakarta(new Date(order.submitted_at))}
                    </td>
                  </tr>
                );
              })}
              {metrics.recent_orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="font-body-sm px-lg py-lg text-center text-on-surface-variant"
                  >
                    Belum ada pesanan terbaru.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end border-t border-outline-variant bg-surface-container-low p-sm">
          <Link
            href="/admin/pesanan"
            className="hover:text-primary-fixed flex items-center gap-1 px-sm py-xs text-sm font-bold text-primary transition-colors"
          >
            View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
