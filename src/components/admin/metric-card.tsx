export interface MetricCardProps {
  label: string;
  value: number;
  icon?: string;
  variant?: "pending" | "verified" | "rejected" | "available" | "reserved" | "sold";
  unit?: string;
}

const ICON_CONFIG: Record<
  NonNullable<MetricCardProps["variant"]>,
  { icon: string; iconClass: string; barClass?: string; isError?: boolean }
> = {
  pending: {
    icon: "pending_actions",
    iconClass: "text-secondary-container bg-secondary-container/10",
    barClass: "bg-secondary-container w-[15%]",
  },
  verified: {
    icon: "verified",
    iconClass: "text-primary-container bg-primary-container/10",
    barClass: "bg-primary-container w-[70%]",
  },
  rejected: {
    icon: "cancel",
    iconClass: "text-error bg-error/10",
    barClass: "bg-error w-[5%]",
    isError: true,
  },
  available: {
    icon: "sim_card",
    iconClass: "text-on-surface-variant bg-surface-variant",
  },
  reserved: {
    icon: "bookmark",
    iconClass: "text-secondary-container bg-secondary-container/10",
  },
  sold: {
    icon: "shopping_bag",
    iconClass: "text-primary-container bg-primary-container/10",
  },
};

export function MetricCard({
  label,
  value,
  icon,
  variant = "available",
  unit = "Pesanan",
}: MetricCardProps) {
  const cfg = ICON_CONFIG[variant];
  const activeIcon = icon ?? cfg.icon;
  const isSold = variant === "sold";

  return (
    <div
      className={`glass-card group relative flex flex-col gap-sm overflow-hidden rounded-xl border border-outline-variant/50 p-lg transition-all ${
        isSold ? "border-b-2 border-b-primary-container" : ""
      }`}
    >
      <div className="pointer-events-none absolute right-0 top-0 -mr-10 -mt-10 h-32 w-32 rounded-full bg-primary-container/10 blur-3xl transition-transform group-hover:scale-150" />

      <div className="z-10 flex items-start justify-between">
        <h4 className="font-label-bold text-label-bold uppercase tracking-wider text-on-surface-variant">
          {label}
        </h4>
        <span className={`material-symbols-outlined rounded-md p-1 text-xl ${cfg.iconClass}`}>
          {activeIcon}
        </span>
      </div>

      <div className="z-10 mt-sm flex items-baseline gap-2">
        <span
          className={`font-display text-data-display font-extrabold ${
            cfg.isError
              ? "text-error"
              : isSold
                ? "text-primary-container"
                : "bg-gradient-to-b from-white to-[#ffdad7] bg-clip-text text-transparent"
          }`}
        >
          {value.toLocaleString("id-ID")}
        </span>
        {unit && <span className="font-body-sm text-body-sm text-on-surface-variant">{unit}</span>}
      </div>

      {cfg.barClass && (
        <div className="bg-surface-variant mt-auto h-1 w-full overflow-hidden rounded-full">
          <div className={`h-full rounded-full ${cfg.barClass}`} />
        </div>
      )}
    </div>
  );
}
