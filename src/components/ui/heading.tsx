import type { ElementType, ComponentPropsWithoutRef, ReactNode } from "react";

/**
 * Display/headline/title scale from DESIGN.md §3. `as` decouples the
 * semantic heading level (h1-h4) from the visual style — a section may
 * need an `<h2>` that looks like `title-md`, or an `<h1>` styled as
 * `display-lg`. `headline-lg-mobile` applies below 768px and `headline-lg`
 * above via responsive classes (DESIGN.md §9), not JavaScript.
 */
export type HeadingVariant = "display-lg" | "headline-lg" | "headline-responsive" | "title-md";

const VARIANT_CLASSES: Record<HeadingVariant, string> = {
  "display-lg": "font-display text-display-lg",
  "headline-lg": "font-display text-headline-lg",
  // Mobile-first: headline-lg-mobile by default, headline-lg from 768px up.
  "headline-responsive": "font-display text-headline-lg-mobile md:text-headline-lg",
  "title-md": "font-display text-title-md",
};

type HeadingOwnProps<E extends ElementType> = {
  as: E;
  variant?: HeadingVariant;
  children: ReactNode;
};

export type HeadingProps<E extends ElementType> = HeadingOwnProps<E> &
  Omit<ComponentPropsWithoutRef<E>, keyof HeadingOwnProps<E>>;

export function Heading<E extends ElementType>({
  as,
  variant = "headline-lg",
  className,
  children,
  ...rest
}: HeadingProps<E> & { className?: string }) {
  const classes = [VARIANT_CLASSES[variant], className].filter(Boolean).join(" ");
  // A fully-typed polymorphic `as` prop cannot be expressed without an
  // escape hatch at the JSX call site itself — TypeScript can't prove the
  // narrowed `E` accepts `{ className, children, ...rest }` for every
  // possible element type. The public `HeadingProps<E>` signature above is
  // still fully typed for callers; only this internal render is loosened.
  const Component = as as ElementType;
  return (
    <Component className={classes} {...rest}>
      {children}
    </Component>
  );
}
