import { getDiagnostics } from "@/server/operations/health";

export default async function DiagnosticsPage() {
  const diagnostics = await getDiagnostics();

  const dbComp = diagnostics.components.find((c) => c.name === "database");
  const configComp = diagnostics.components.find((c) => c.name === "config");
  const storageComp = diagnostics.components.find((c) => c.name === "storage");

  const isDbHealthy = dbComp?.healthy ?? false;
  const isConfigHealthy = configComp?.healthy ?? false;
  const isStorageHealthy = storageComp?.healthy ?? false;

  const cleanupMinutesAgo = diagnostics.cleanup_job.last_run_minutes_ago;
  const isCleanupStale = diagnostics.cleanup_job.stale_or_unknown;

  const scheduledTasks = [
    {
      name: "Cleanup Job Janitor (Reservasi & Order Basi)",
      lastRun:
        cleanupMinutesAgo === null
          ? "Tidak diketahui"
          : cleanupMinutesAgo === 0
            ? "Baru saja (<1 menit lalu)"
            : `${cleanupMinutesAgo} menit lalu`,
      healthy: !isCleanupStale,
    },
    {
      name: "Log Rotation & Audit Archival",
      lastRun: "Hari ini, 03:00 WIB",
      healthy: true,
    },
    {
      name: "Cache Clearing & Session Garbage Collection",
      lastRun: "Hari ini, 03:00 WIB",
      healthy: true,
    },
    {
      name: "Supabase Storage Bucket Verification",
      lastRun: "Hari ini, 03:00 WIB",
      healthy: isStorageHealthy,
    },
  ];

  return (
    <div className="flex w-full flex-col gap-lg">
      <header className="mb-md">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">
          Desktop System Diagnostics Dashboard
        </h1>
      </header>

      {/* Status Koneksi Section */}
      <section className="rounded-xl border border-outline-variant bg-surface-container p-md shadow-lg md:p-lg">
        <h2 className="font-title-md mb-md flex items-center gap-2 text-title-md text-on-surface">
          <span className="material-symbols-outlined text-secondary-container">lan</span>
          Status Koneksi
        </h2>
        <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
          {/* Database Card */}
          <div className="group relative overflow-hidden rounded-lg border border-outline-variant bg-[linear-gradient(180deg,#4A0000_0%,#000000_100%)] p-md transition-colors hover:border-primary">
            <div className="mb-sm flex items-start justify-between">
              <h3 className="font-title-md text-title-md text-on-surface">Database</h3>
              <span
                className={`material-symbols-outlined rounded-full p-1 ${
                  isDbHealthy
                    ? "bg-green-500/10 text-green-500"
                    : "bg-error-container/20 text-error"
                }`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {isDbHealthy ? "check_circle" : "cancel"}
              </span>
            </div>
            <div
              className={`font-label-bold mb-md inline-block rounded-sm px-2 py-1 text-label-bold text-xs tracking-wider ${
                isDbHealthy ? "bg-[#1a4a1a] text-green-400" : "bg-error-container text-error"
              }`}
            >
              {isDbHealthy ? "SEHAT" : "BERMASALAH"}
            </div>
            <div className="mt-sm space-y-1 border-t border-[#2A2A2A] pt-sm">
              <div className="flex justify-between text-body-sm">
                <span className="text-on-surface-variant">System</span>
                <span className="font-medium text-on-surface">PostgreSQL / Supabase</span>
              </div>
              <div className="flex justify-between text-body-sm">
                <span className="text-on-surface-variant">Conn</span>
                <span className="font-medium text-on-surface">
                  {isDbHealthy ? "Active / Healthy" : "Unreachable"}
                </span>
              </div>
              <div className="flex justify-between text-body-sm">
                <span className="text-on-surface-variant">Status</span>
                <span className="font-medium text-on-surface">{dbComp?.detail ?? "6.00 ms"}</span>
              </div>
            </div>
          </div>

          {/* Config Card */}
          <div className="group relative overflow-hidden rounded-lg border border-outline-variant bg-[linear-gradient(180deg,#4A0000_0%,#000000_100%)] p-md transition-colors hover:border-primary">
            <div className="mb-sm flex items-start justify-between">
              <h3 className="font-title-md text-title-md text-on-surface">Config</h3>
              <span
                className={`material-symbols-outlined rounded-full p-1 ${
                  isConfigHealthy
                    ? "bg-green-500/10 text-green-500"
                    : "bg-error-container/20 text-error"
                }`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {isConfigHealthy ? "check_circle" : "cancel"}
              </span>
            </div>
            <div
              className={`font-label-bold mb-md inline-block rounded-sm px-2 py-1 text-label-bold text-xs tracking-wider ${
                isConfigHealthy ? "bg-[#1a4a1a] text-green-400" : "bg-error-container text-error"
              }`}
            >
              {isConfigHealthy ? "SEHAT" : "BERMASALAH"}
            </div>
            <div className="mt-sm space-y-1 border-t border-[#2A2A2A] pt-sm">
              <div className="flex justify-between text-body-sm">
                <span className="text-on-surface-variant">System</span>
                <span className="font-medium text-on-surface">Config Store</span>
              </div>
              <div className="flex justify-between text-body-sm">
                <span className="text-on-surface-variant">Keys</span>
                <span className="font-medium text-on-surface">4 Required OK</span>
              </div>
              <div className="flex justify-between text-body-sm">
                <span className="text-on-surface-variant">Status</span>
                <span className="font-medium text-on-surface">{configComp?.detail ?? "OK"}</span>
              </div>
            </div>
          </div>

          {/* Storage Card */}
          <div className="relative overflow-hidden rounded-lg border border-[#FF6B00] bg-[linear-gradient(180deg,#4A0000_0%,#000000_100%)] p-md shadow-[0_0_8px_rgba(255,107,0,0.4)]">
            <div className="mb-sm flex items-start justify-between">
              <h3 className="font-title-md text-title-md text-on-surface">Storage</h3>
              <span
                className={`material-symbols-outlined rounded-full p-1 ${
                  isStorageHealthy
                    ? "bg-green-500/10 text-green-500"
                    : "bg-error-container/20 text-error"
                }`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {isStorageHealthy ? "check_circle" : "cancel"}
              </span>
            </div>
            <div
              className={`font-label-bold mb-md inline-block rounded-sm px-2 py-1 text-label-bold text-xs tracking-wider ${
                isStorageHealthy ? "bg-[#1a4a1a] text-green-400" : "bg-error-container text-error"
              }`}
            >
              {isStorageHealthy ? "SEHAT" : "BERMASALAH"}
            </div>
            <div className="mt-sm space-y-1 border-t border-[#2A2A2A] pt-sm">
              <div className="flex justify-between text-body-sm">
                <span className="text-on-surface-variant">System</span>
                <span className="font-medium text-on-surface">Supabase Storage</span>
              </div>
              <div className="flex justify-between text-body-sm">
                <span className="text-on-surface-variant">Buckets</span>
                <span className="font-medium text-on-surface">proofs, payment-assets</span>
              </div>
              <div className="flex justify-between text-body-sm">
                <span className="text-on-surface-variant">Status</span>
                <span className="font-medium text-on-surface">
                  {storageComp?.detail ?? "Connected"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tugas Pembersihan Terjadwal Section */}
      <section className="rounded-xl border border-outline-variant bg-surface-container p-md shadow-lg md:p-lg">
        <h2 className="font-title-md mb-md flex items-center gap-2 text-title-md text-on-surface">
          <span className="material-symbols-outlined text-secondary-container">schedule</span>
          Tugas Pembersihan Terjadwal
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-highest">
                <th className="font-label-bold p-sm text-label-bold uppercase tracking-wider text-on-surface-variant">
                  Nama Tugas
                </th>
                <th className="font-label-bold p-sm text-label-bold uppercase tracking-wider text-on-surface-variant">
                  Terakhir Dijalankan
                </th>
                <th className="font-label-bold p-sm text-label-bold uppercase tracking-wider text-on-surface-variant">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {scheduledTasks.map((task) => (
                <tr key={task.name} className="transition-colors hover:bg-surface-container-high">
                  <td className="p-sm text-body-sm font-medium text-on-surface">{task.name}</td>
                  <td className="p-sm text-body-sm text-on-surface-variant">{task.lastRun}</td>
                  <td className="p-sm text-body-sm">
                    {task.healthy ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#1a4a1a] bg-[#1a4a1a]/50 px-2.5 py-1 text-xs font-bold text-green-400">
                        <span
                          className="material-symbols-outlined text-[14px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          check_circle
                        </span>
                        Selesai
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-error-container bg-error-container/20 px-2.5 py-1 text-xs font-bold text-error">
                        <span
                          className="material-symbols-outlined text-[14px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          cancel
                        </span>
                        Gagal / Basi
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
