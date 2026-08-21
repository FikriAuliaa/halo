import type { HTMLAttributes, ReactNode } from "react";

export type BadgeVariant = "orange" | "red" | "outline" | "neutral";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  // secondary-container fill with the corrected dark text (DESIGN.md §2.4
  // contrast remediation) — the "Terkunci" and "Rekomendasi" treatment.
  orange: "bg-secondary-container text-on-secondary-container",
  red: "bg-primary-container text-on-primary-container",
  outline: "border border-outline text-on-surface-variant",
  neutral: "bg-surface-container-high text-on-surface-variant",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: ReactNode;
  children: ReactNode;
}

/**
 * A badge always carries text, never color alone (DESIGN.md §7/§12) — this
 * is enforced by the type signature requiring `children`, not just a
 * color prop.
 */
export function Badge({ variant = "orange", icon, className, children, ...rest }: BadgeProps) {
  const classes = [
    "inline-flex items-center gap-1 rounded-full px-sm py-1 font-body text-label-bold uppercase",
    VARIANT_CLASSES[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={classes} {...rest}>
      {icon}
      {children}
    </span>
  );
}
