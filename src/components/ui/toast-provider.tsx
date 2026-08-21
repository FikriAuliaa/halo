"use client";

import * as RadixToast from "@radix-ui/react-toast";
import type { ReactNode } from "react";
import { ToastContext, useToastState } from "@/hooks/use-toast";
import { Toast } from "./toast";

/**
 * Mount once near the app root. `useToast()` is then available to any
 * descendant to fire a toast. The stack caps at 3 (oldest dropped first)
 * and the container is `aria-live="polite"` by default via Radix's
 * ToastProvider — individual error toasts escalate to `role="alert"`
 * (B040).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { toasts, showToast, dismissToast } = useToastState();

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      <RadixToast.Provider swipeDirection="right">
        {children}
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
        <RadixToast.Viewport className="fixed bottom-0 right-0 z-50 flex w-full max-w-sm flex-col gap-sm p-container-margin md:bottom-auto md:top-container-margin" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}
