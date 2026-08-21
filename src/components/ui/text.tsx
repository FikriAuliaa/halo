import type { ElementType, ComponentPropsWithoutRef, ReactNode } from "react";

/**
 * Body/label text scale from DESIGN.md §3. `as` decouples the semantic
 * element from the visual style — visual weight must never dictate
 * heading level (B033).
 */
export type TextVariant = "body-lg" | "body-sm" | "label-bold";

const VARIANT_CLASSES: Record<TextVariant, string> = {
  "body-lg": "font-body text-body-lg",
  "body-sm": "font-body text-body-sm",
  "label-bold": "font-body text-label-bold",
};

type TextOwnProps<E extends ElementType> = {
  as?: E;
  variant?: TextVariant;
  children: ReactNode;
};

export type TextProps<E extends ElementType> = TextOwnProps<E> &
  Omit<ComponentPropsWithoutRef<E>, keyof TextOwnProps<E>>;

const DEFAULT_ELEMENT = "p";

export function Text<E extends ElementType = typeof DEFAULT_ELEMENT>({
  as,
  variant = "body-lg",
  className,
  children,
  ...rest
}: TextProps<E> & { className?: string }) {
  const Component = as ?? DEFAULT_ELEMENT;
  const classes = [VARIANT_CLASSES[variant], className].filter(Boolean).join(" ");
  return (
    <Component className={classes} {...rest}>
      {children}
    </Component>
  );
}
