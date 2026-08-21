/**
 * The large-figure treatment used by package cards ("160GB") and payment
 * summaries — a `data-display`-scale value with a smaller inline unit,
 * per DESIGN.md §3 "Data Hierarchy" and the reference's split-unit markup
 * (e.g. `160<span class="text-[20px]">GB</span>`).
 */
export interface DataDisplayProps {
  value: string | number;
  unit?: string;
  className?: string;
}

export function DataDisplay({ value, unit, className }: DataDisplayProps) {
  const classes = ["font-display text-data-display text-on-surface", className]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes}>
      {value}
      {unit ? <span className="text-[20px]">{unit}</span> : null}
    </div>
  );
}
