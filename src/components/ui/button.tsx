"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  // Solid brand-red, pill, white bold label, red glow — DESIGN.md §8, the
  // reference's primary CTA treatment on every screen.
  primary:
    "bg-primary-container text-on-primary-container shadow-glow-red hover:brightness-105 disabled:bg-surface-container disabled:text-on-surface-variant disabled:shadow-none",
  secondary: "border border-outline text-on-surface bg-transparent hover:bg-surface-container",
  ghost: "bg-transparent text-on-surface hover:bg-surface-container-low",
  destructive: "bg-error-container text-on-error-container hover:brightness-105",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  // 44px minimum touch target at every size (DESIGN.md §12).
  sm: "min-h-[44px] px-sm py-2 font-body text-label-bold",
  md: "min-h-[44px] px-md py-3 font-display text-title-md",
  lg: "min-h-[56px] px-lg py-4 font-display text-title-md",
};

// DESIGN.md §5: CTAs are pill-shaped. The package screen's rounded-xl CTA
// is the documented exception (B034) and is not reproduced here — every
// Button instance is a pill regardless of variant.
const BASE_CLASSES =
  "relative inline-flex items-center justify-center gap-xs rounded-full transition-all active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-container disabled:cursor-not-allowed disabled:active:scale-100";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  trailingIcon?: ReactNode;
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    trailingIcon,
    disabled,
    className,
    children,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;
  const classes = [BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={ref}
      type={rest.type ?? "button"}
      className={classes}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {/* The label stays visible and in the accessibility tree while
          loading — `visibility:hidden`/`display:none` both remove content
          from the accessibility tree, so hiding the label to make room for
          a centered spinner (an earlier version of this component did
          that) left the button with no accessible name at all, caught by
          an axe run against the component gallery (B047). The spinner is
          simply prepended instead; width is not artificially preserved,
          which is an acceptable trade-off against shipping an unnamed
          button. */}
      {loading ? <Spinner /> : null}
      {children}
      {!loading ? trailingIcon : null}
    </button>
  );
});
