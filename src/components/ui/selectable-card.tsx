"use client";

import { forwardRef, type ReactNode } from "react";
import { Card, GradientCard } from "./card";

export type SelectableCardSurface = "base" | "gradient";

export interface SelectableCardProps {
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  surface?: SelectableCardSurface;
  children: ReactNode;
  className?: string;
  /** Accessible name when the visible content alone doesn't provide one. */
  "aria-label"?: string;
}

/**
 * Selection primitive for the number grid and package scroller. Renders as
 * a `<button role="radio">` — never a clickable `<div>` — so selection is
 * both keyboard-operable and programmatically detectable via `aria-checked`
 * (DESIGN.md §7, B036). The parent composing multiple instances is
 * responsible for wrapping them in a `role="radiogroup"` container.
 *
 * Selection is conveyed by both the glow ring/border weight AND
 * `aria-checked` — never by color alone, so it reads correctly for
 * color-blind and non-visual users alike.
 */
export const SelectableCard = forwardRef<HTMLButtonElement, SelectableCardProps>(
  function SelectableCard(
    { selected, disabled = false, onSelect, surface = "base", className, children, ...rest },
    ref,
  ) {
    const Surface = surface === "gradient" ? GradientCard : Card;
    const stateClasses = disabled
      ? "opacity-60 cursor-not-allowed"
      : selected
        ? "border-2 border-secondary-container shadow-glow-orange scale-[1.02]"
        : "hover:border-outline cursor-pointer";

    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={selected}
        disabled={disabled}
        onClick={disabled ? undefined : onSelect}
        className="text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-container disabled:pointer-events-none"
        {...rest}
      >
        <Surface className={[stateClasses, className].filter(Boolean).join(" ")}>
          {children}
        </Surface>
      </button>
    );
  },
);
