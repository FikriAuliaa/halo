"use client";

import type { ReactNode } from "react";
import { Button } from "./button";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-sm px-lg py-xl text-center">
      {icon ? (
        <span
          aria-hidden="true"
          className="material-symbols-outlined text-[48px] text-on-surface-variant"
        >
          {icon}
        </span>
      ) : null}
      <p className="font-display text-title-md text-on-surface">{title}</p>
      {description ? (
        <p className="font-body text-body-sm text-on-surface-variant">{description}</p>
      ) : null}
      {actionLabel && onAction ? (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

// Preset content, Indonesian, plain and actionable (B043).
export const EMPTY_STATE_PRESETS = {
  noNumbersAvailable: {
    icon: "sim_card_alert",
    title: "Belum ada nomor tersedia saat ini",
    description: "Coba muat ulang beberapa saat lagi.",
    actionLabel: "Muat Ulang",
  },
  noSearchResults: {
    icon: "search_off",
    title: "Nomor tidak ditemukan",
    description: "Coba kata kunci digit akhir yang berbeda.",
  },
  noOrders: {
    icon: "inbox",
    title: "Belum ada pesanan",
    description: "Pesanan yang masuk akan muncul di sini.",
  },
} as const;
