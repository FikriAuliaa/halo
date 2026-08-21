"use client";

import { useRouteFocus } from "@/hooks/use-route-focus";

/** Mounted once in the root layout — see `useRouteFocus`'s doc comment. */
export function RouteFocusManager() {
  useRouteFocus();
  return null;
}
