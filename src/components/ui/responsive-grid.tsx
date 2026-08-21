import type { ReactNode } from "react";

export type ResponsiveGridBehavior = "grid-always" | "scroll-until-desktop";

export interface ResponsiveGridProps {
  children: ReactNode;
  /**
   * "grid-always" — 1 column on mobile, 2 at >=768px, 3 at >=1024px
   * (the number grid). "scroll-until-desktop" — a horizontal snap-scroller
   * below 1024px, a static grid at >=1024px (the package scroller) —
   * comparison-shopping benefits from the scroll metaphor even with room
   * for a grid; a grid is used only once there's genuinely enough width
   * for it not to feel cramped (DESIGN.md §9, B046).
   */
  behavior: ResponsiveGridBehavior;
}

const GRID_ALWAYS_CLASSES = "grid grid-cols-1 gap-sm md:grid-cols-2 lg:grid-cols-3";
const SCROLL_UNTIL_DESKTOP_CLASSES =
  "flex gap-md overflow-x-auto no-scrollbar snap-x snap-mandatory px-container-margin lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0";

export function ResponsiveGrid({ children, behavior }: ResponsiveGridProps) {
  const classes = behavior === "grid-always" ? GRID_ALWAYS_CLASSES : SCROLL_UNTIL_DESKTOP_CLASSES;
  return <div className={classes}>{children}</div>;
}
