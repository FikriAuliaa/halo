import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDiagnostics } from "@/server/operations/health";

/**
 * `/admin/diagnostics` (B128) — an admin-only view of the same
 * readiness data `/api/health/ready` exposes, plus the cleanup job
 * status the public endpoint deliberately doesn't reveal. Lives under
 * `(dashboard)` like every other admin screen, so it inherits
 * `AdminShell`/nav/`ToastProvider` — the block spec's own file path
 * predates that grouping decision (same resolution as `/admin/nomor`
 * and `/admin/konfigurasi`).
 */
export default async function DiagnosticsPage() {
  const diagnostics = await getDiagnostics();

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="font-display text-headline-lg text-on-surface">Diagnostik</h1>

      <Card className="flex flex-col gap-sm">
        <h2 className="font-display text-title-md text-on-surface">Status Koneksi</h2>
        {diagnostics.components.map((component) => (
          <div key={component.name} className="flex items-center justify-between">
            <span className="font-body text-body-lg capitalize text-on-surface">
              {component.name}
            </span>
            <div className="flex items-center gap-sm">
              {component.detail ? (
                <span className="font-body text-body-sm text-on-surface-variant">
                  {component.detail}
                </span>
              ) : null}
              <Badge variant={component.healthy ? "outline" : "red"}>
                {component.healthy ? "Sehat" : "Bermasalah"}
              </Badge>
            </div>
          </div>
        ))}
      </Card>

      <Card className="flex flex-col gap-sm">
        <h2 className="font-display text-title-md text-on-surface">Tugas Pembersihan Terjadwal</h2>
        <div className="flex items-center justify-between">
          <span className="font-body text-body-lg text-on-surface">Terakhir Berjalan</span>
          <span className="font-body text-body-sm text-on-surface-variant">
            {diagnostics.cleanup_job.last_run_minutes_ago === null
              ? "Tidak diketahui"
              : `${diagnostics.cleanup_job.last_run_minutes_ago} menit lalu`}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-body text-body-lg text-on-surface">Status</span>
          <Badge variant={diagnostics.cleanup_job.stale_or_unknown ? "red" : "outline"}>
            {diagnostics.cleanup_job.stale_or_unknown ? "Basi / Tidak Diketahui" : "Normal"}
          </Badge>
        </div>
      </Card>
    </div>
  );
}
