"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Moves focus to the new page's main heading after a client-side route
 * change (B122). Without this, a keyboard/screen-reader user's focus
 * stays wherever it was on the previous page (often nowhere sensible —
 * `document.body`), so navigating gives no indication anything changed.
 * Skips the very first render (the initial page load already has its
 * own natural focus behavior) and only acts on actual pathname changes.
 */
export function useRouteFocus(): void {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const heading = document.querySelector<HTMLElement>("h1");
    if (!heading) return;
    if (!heading.hasAttribute("tabindex")) {
      heading.setAttribute("tabindex", "-1");
    }
    heading.focus();
  }, [pathname]);
}
