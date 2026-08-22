import { DataDisplay } from "@/components/ui/data-display";
import { Card } from "@/components/ui/card";

export interface MetricCardProps {
  label: string;
  value: number;
  primary?: boolean;
}

/** Summary card using the `data-display` treatment (B100). `primary`
 * (pending orders awaiting verification) is visually dominant — the only
 * number here that represents a student waiting on a human. */
export function MetricCard({ label, value, primary = false }: MetricCardProps) {
  return (
    <Card className={primary ? "border-primary-container bg-primary-container/10" : undefined}>
      <div className="flex flex-col gap-1">
        <span className="font-body text-body-sm text-on-surface-variant">{label}</span>
        <DataDisplay value={value} {...(primary ? { className: "text-primary" } : {})} />
      </div>
    </Card>
  );
}
