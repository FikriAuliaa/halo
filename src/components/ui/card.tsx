import type { HTMLAttributes, ReactNode } from "react";

/**
 * Base surface card — flat `surface-container` fill, `divider`-toned
 * border, 12px radius (DESIGN.md §6, the number-card / summary-card
 * treatment).
 */
export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const classes = [
    "rounded-card border border-outline-variant bg-surface-container p-md",
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

/**
 * The crimson-to-black gradient card used by package cards and payment/
 * confirmation summaries — 16px radius (DESIGN.md §6).
 */
export function GradientCard({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const classes = ["rounded-package border border-divider bg-card-gradient p-md", className]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardDivider({ className }: { className?: string }) {
  return <div className={["border-b border-divider", className].filter(Boolean).join(" ")} />;
}
