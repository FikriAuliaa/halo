"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Blocks Escape/overlay-click dismissal while a mutation is in flight. */
  preventClose?: boolean;
}

/**
 * DESIGN.md §6 "Overlays": 60% opacity black backdrop, 20px blur. Radix
 * handles focus trapping and restoration natively; `preventClose` is the
 * one behavior layered on top, for destructive admin actions that must
 * not be dismissable mid-request (B039).
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  preventClose,
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={preventClose ? () => {} : onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[20px]" />
        <RadixDialog.Content
          aria-modal="true"
          className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-modal border border-divider bg-surface-container-high p-lg"
          onEscapeKeyDown={(e) => preventClose && e.preventDefault()}
          onPointerDownOutside={(e) => preventClose && e.preventDefault()}
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          <RadixDialog.Title className="font-display text-title-md text-on-surface">
            {title}
          </RadixDialog.Title>
          {description ? (
            <RadixDialog.Description className="mt-1 font-body text-body-sm text-on-surface-variant">
              {description}
            </RadixDialog.Description>
          ) : null}
          <div className="mt-md">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
