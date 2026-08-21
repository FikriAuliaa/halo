import type { HTMLAttributes } from "react";

/**
 * Base shimmer block. Always `aria-hidden` individually — the *container*
 * composing several of these announces loading once via `aria-busy`
 * (DESIGN.md §7/§12, B042). Shimmer is disabled under reduced motion
 * (`motion-safe:animate-pulse` — Tailwind only applies the animation when
 * the user hasn't requested reduced motion).
 */
export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const classes = ["motion-safe:animate-pulse rounded-card bg-surface-container-high", className]
    .filter(Boolean)
    .join(" ");
  return <div aria-hidden="true" className={classes} {...rest} />;
}
