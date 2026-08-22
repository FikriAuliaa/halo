"use client";

import { createContext, useCallback, useContext, useState } from "react";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (variant: ToastVariant, message: string) => void;
  dismissToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_STACK = 3;
// Auto-dismiss scales with message length so a longer message stays
// readable; errors never auto-dismiss (B040) — the student/admin must
// acknowledge them, since an error is never the only copy of important
// information but it is information the person must actually register.
const BASE_DURATION_MS = 3000;
const MS_PER_CHARACTER = 60;

export function computeDurationMs(message: string): number {
  return BASE_DURATION_MS + message.length * MS_PER_CHARACTER;
}

export function useToastState() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((variant: ToastVariant, message: string) => {
    const id = crypto.randomUUID();
    setToasts((current) => {
      const next = [...current, { id, variant, message }];
      // Cap the stack at 3, dropping the oldest first.
      return next.length > MAX_STACK ? next.slice(next.length - MAX_STACK) : next;
    });
    return id;
  }, []);

  return { toasts, showToast, dismissToast };
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
