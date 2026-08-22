import Link from "next/link";
import { Card } from "@/components/ui/card";

export interface AlertsPanelProps {
  stalePendingOrders: number;
  cleanupJobStale: boolean;
  cleanupJobLastRunMinutesAgo: number | null;
}

/** Operational alerts (B099/B100) — each actionable, linking to the
 * relevant screen; never just an inert badge. */
export function AlertsPanel({
  stalePendingOrders,
  cleanupJobStale,
  cleanupJobLastRunMinutesAgo,
}: AlertsPanelProps) {
  const alerts: Array<{ message: string; href?: string; linkLabel?: string }> = [];

  if (stalePendingOrders > 0) {
    alerts.push({
      message: `${stalePendingOrders} pesanan menunggu verifikasi lebih dari 24 jam.`,
      href: "/admin/pesanan?status=pending",
      linkLabel: "Lihat pesanan",
    });
  }
  if (cleanupJobStale) {
    alerts.push({
      message:
        cleanupJobLastRunMinutesAgo === null
          ? "Belum ada catatan proses pembersihan reservasi kedaluwarsa."
          : `Proses pembersihan reservasi kedaluwarsa terakhir berjalan ${cleanupJobLastRunMinutesAgo} menit lalu.`,
    });
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <p className="font-body text-body-sm text-on-surface-variant">Tidak ada peringatan.</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-sm border-secondary-container">
      {alerts.map((alert, i) => (
        <div key={i} className="flex items-center justify-between gap-sm">
          <p className="font-body text-body-sm text-on-surface">{alert.message}</p>
          {alert.href ? (
            <Link
              href={alert.href}
              className="whitespace-nowrap font-body text-body-sm text-secondary"
            >
              {alert.linkLabel}
            </Link>
          ) : null}
        </div>
      ))}
    </Card>
  );
}
