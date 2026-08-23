import Link from "next/link";
import { MetricCard } from "@/components/admin/metric-card";
import { AlertsPanel } from "@/components/admin/alerts-panel";
import { formatDateTimeJakarta } from "@/lib/format";
import { formatPhoneDisplay } from "@/domain/phone";
import { adminGetDashboardMetrics } from "@/server/operations/admin/dashboard-metrics";

export default async function AdminDashboardPage() {
  const metrics = await adminGetDashboardMetrics();

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-xl">
      {/* Top Header info */}
      <div className="flex items-center justify-between">
        <h2 className="font-display-lg text-headline-lg font-semibold text-on-surface">
          Dashboard Overview
        </h2>
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          Diperbarui {formatDateTimeJakarta(new Date(metrics.generated_at))}
        </span>
      </div>

      {/* Alerts Section */}
      <AlertsPanel
        stalePendingOrders={metrics.alerts.stale_pending_orders}
        cleanupJobStale={metrics.alerts.cleanup_job_stale}
        cleanupJobLastRunMinutesAgo={metrics.alerts.cleanup_job_last_run_minutes_ago}
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3 lg:gap-lg">
        <MetricCard
          label="Menunggu Verifikasi"
          value={metrics.orders_pending}
          variant="pending"
          unit="Pesanan"
        />
        <MetricCard
          label="Diverifikasi Hari Ini"
          value={metrics.orders_verified_today}
          variant="verified"
          unit="Pesanan"
        />
        <MetricCard
          label="Ditolak Hari Ini"
          value={metrics.orders_rejected_today}
          variant="rejected"
          unit="Pesanan"
        />
        <MetricCard
          label="Nomor Tersedia"
          value={metrics.numbers.available}
          variant="available"
          unit="Nomor"
        />
        <MetricCard
          label="Nomor Direservasi"
          value={metrics.numbers.reserved}
          variant="reserved"
          unit="Nomor"
        />
        <MetricCard
          label="Nomor Terjual"
          value={metrics.numbers.sold + metrics.numbers.sold_offline}
          variant="sold"
          unit="Nomor"
        />
      </div>

      {/* Recent Orders Section */}
      <section className="glass-card flex flex-1 flex-col overflow-hidden rounded-xl border border-outline-variant/30">
        <div className="flex items-center justify-between border-b border-outline-variant/30 bg-surface-container-low/50 p-lg">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary-container">list_alt</span>
            <h3 className="font-title-md text-title-md font-semibold text-on-surface">
              Pesanan Terbaru
            </h3>
          </div>
          <Link
            href="/admin/pesanan"
            className="font-label-bold flex items-center gap-1 text-label-bold uppercase tracking-wider text-on-surface-variant transition-colors hover:text-primary-container"
          >
            Lihat Semua <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant/50 bg-surface-container/50">
                <th className="font-label-bold p-md text-label-bold uppercase tracking-wider text-on-surface-variant">
                  Referensi
                </th>
                <th className="font-label-bold p-md text-label-bold uppercase tracking-wider text-on-surface-variant">
                  Nomor
                </th>
                <th className="font-label-bold p-md text-label-bold uppercase tracking-wider text-on-surface-variant">
                  Nama
                </th>
                <th className="font-label-bold p-md text-label-bold uppercase tracking-wider text-on-surface-variant">
                  Status
                </th>
                <th className="font-label-bold p-md text-label-bold uppercase tracking-wider text-on-surface-variant">
                  Diajukan
                </th>
              </tr>
            </thead>
            <tbody className="font-body-sm divide-y divide-outline-variant/20 text-body-sm">
              {metrics.recent_orders.map((order) => {
                const isVerified = order.status === "verified";
                const isPending = order.status === "pending";
                const isRejected = order.status === "rejected";

                return (
                  <tr
                    key={order.id}
                    className="hover:bg-surface-variant/30 group cursor-pointer transition-colors"
                  >
                    <td className="p-md font-mono text-xs font-semibold text-on-surface">
                      <Link href={`/admin/pesanan/${order.id}`} className="hover:underline">
                        {order.order_ref}
                      </Link>
                    </td>
                    <td className="p-md font-semibold text-primary-container">
                      {formatPhoneDisplay(order.number)}
                    </td>
                    <td className="p-md text-on-surface">{order.full_name}</td>
                    <td className="p-md">
                      {isVerified ? (
                        <span className="text-primary-fixed inline-flex items-center rounded-full border border-primary-container/50 bg-primary-container/20 px-2.5 py-1 text-xs font-bold">
                          Diverifikasi
                        </span>
                      ) : isPending ? (
                        <span className="inline-flex items-center rounded-full border border-secondary-container/30 bg-secondary-container/20 px-2.5 py-1 text-xs font-bold text-secondary-container">
                          Menunggu Verifikasi
                        </span>
                      ) : isRejected ? (
                        <span className="inline-flex items-center rounded-full border border-error/30 bg-error/20 px-2.5 py-1 text-xs font-bold text-error">
                          Ditolak
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-surface-container-high px-2.5 py-1 text-xs font-bold text-on-surface-variant">
                          {order.status}
                        </span>
                      )}
                    </td>
                    <td className="p-md text-on-surface-variant">
                      {formatDateTimeJakarta(new Date(order.submitted_at))}
                    </td>
                  </tr>
                );
              })}
              {metrics.recent_orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="font-body-sm p-lg text-center text-on-surface-variant">
                    Belum ada pesanan terbaru.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
