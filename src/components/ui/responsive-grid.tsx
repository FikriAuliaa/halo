import type { ReactNode } from "react";

export type ResponsiveGridBehavior = "grid-always" | "scroll-until-desktop";

export interface ResponsiveGridProps {
  children: ReactNode;
  behavior: ResponsiveGridBehavior;
  containerRef?: React.Ref<HTMLDivElement>;
}

const GRID_ALWAYS_CLASSES = "grid grid-cols-1 gap-sm md:grid-cols-2 lg:grid-cols-3";
const SCROLL_UNTIL_DESKTOP_CLASSES =
  "flex gap-md overflow-x-auto no-scrollbar snap-x snap-mandatory px-container-margin lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0";

export function ResponsiveGrid({ children, behavior, containerRef }: ResponsiveGridProps) {
  const classes = behavior === "grid-always" ? GRID_ALWAYS_CLASSES : SCROLL_UNTIL_DESKTOP_CLASSES;
  return (
    <div ref={containerRef} className={classes}>
      {children}
    </div>
  );
}
