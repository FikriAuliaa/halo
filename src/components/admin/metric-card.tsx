export interface MetricCardProps {
  label: string;
  value: number;
  icon?: string;
  primary?: boolean;
}

/** Bento-style metric summary card (ADR-010 / Dashboard Overview template) */
export function MetricCard({ label, value, icon = "analytics" }: MetricCardProps) {
  return (
    <div className="group relative flex items-center gap-md overflow-hidden rounded-xl border border-b-2 border-outline-variant border-b-primary-container bg-[linear-gradient(180deg,rgba(74,0,0,0.4)_0%,rgba(0,0,0,0.8)_100%)] p-md transition-colors hover:border-outline">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-container">
        <span
          className="material-symbols-outlined text-2xl text-on-primary-container"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
      </div>
      <div>
        <p className="font-body-sm mb-1 text-body-sm text-on-surface-variant">{label}</p>
        <p className="font-display text-data-display font-extrabold text-on-surface">{value}</p>
      </div>
      {/* Subtle background glow effect */}
      <div className="pointer-events-none absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-primary-container/10 blur-xl transition-all group-hover:bg-primary-container/20" />
    </div>
  );
}
