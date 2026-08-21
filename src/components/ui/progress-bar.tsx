export type ProgressBarTone = "default" | "error";

export interface ProgressBarProps {
  /** 0-100 */
  percent: number;
  tone?: ProgressBarTone;
  "aria-label"?: string;
}

// Dual-tone bar per DESIGN.md §8: dark-red base track, orange (default) or
// error-red (under the two-minute threshold) indicator.
export function ProgressBar({
  percent,
  tone = "default",
  "aria-label": ariaLabel,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const indicatorClass = tone === "error" ? "bg-error" : "bg-secondary-container";

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high"
    >
      <div
        className={`h-full ${indicatorClass} motion-safe:transition-[width] motion-safe:duration-500`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
