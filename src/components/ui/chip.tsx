import type { HTMLAttributes, ReactNode } from "react";

/**
 * Small rounded informational container — `card-gradient-start` (#4a0000)
 * background, used for the package screen's "Pilih 1 Extra Benefit" chip
 * and similar non-interactive labels (DESIGN.md §8).
 */
export function Chip({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  const classes = [
    "inline-flex items-center rounded-full bg-card-gradient-start px-3 py-1 font-body text-label-bold text-on-surface",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
