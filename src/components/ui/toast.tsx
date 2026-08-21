"use client";

import * as RadixToast from "@radix-ui/react-toast";
import { computeDurationMs, type ToastItem } from "@/hooks/use-toast";

// Radix's own `duration` prop drives its internal auto-close timer — using
// it directly (rather than a parallel setTimeout racing against it) avoids
// two independent dismissal timers fighting over the same toast. Radix
// special-cases `Infinity` to mean "never auto-dismiss"; a large finite
// number instead overflows setTimeout's 32-bit delay internally and fires
// almost immediately — a real bug this caught during B040.
const NO_AUTO_DISMISS = Number.POSITIVE_INFINITY;

const VARIANT_BORDER_CLASS: Record<ToastItem["variant"], string> = {
  // Orange reads as "positive/active" throughout this system (DESIGN.md),
  // so success uses the orange accent border; red is reserved for errors.
  success: "border-l-4 border-l-secondary-container",
  error: "border-l-4 border-l-primary-container",
  warning: "border-l-4 border-l-secondary-container",
  info: "border-l-4 border-l-outline",
};

export interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

/**
 * Errors never auto-dismiss (B040) — the student/admin must acknowledge
 * them via the close button. Every other variant auto-dismisses after a
 * duration proportional to message length.
 */
export function Toast({ toast, onDismiss }: ToastProps) {
  const isError = toast.variant === "error";

  return (
    <RadixToast.Root
      open
      onOpenChange={(open) => !open && onDismiss(toast.id)}
      duration={isError ? NO_AUTO_DISMISS : computeDurationMs(toast.message)}
      // Radix's `type` controls aria-live politeness: errors are
      // assertive/role=alert, everything else is polite/role=status.
      type={isError ? "foreground" : "background"}
      role={isError ? "alert" : "status"}
      className={`flex items-start justify-between gap-sm rounded-card bg-surface-container-high p-md shadow-lg ${VARIANT_BORDER_CLASS[toast.variant]}`}
    >
      <RadixToast.Description className="font-body text-body-sm text-on-surface">
        {toast.message}
      </RadixToast.Description>
      <RadixToast.Close
        aria-label="Tutup notifikasi"
        className="font-body text-label-bold text-on-surface-variant"
      >
        ✕
      </RadixToast.Close>
    </RadixToast.Root>
  );
}
