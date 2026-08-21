"use client";

import { Button } from "./button";

export type ErrorStateVariant = "network" | "server" | "not-found" | "forbidden" | "expired";

interface ErrorPreset {
  icon: string;
  title: string;
  description: string;
  /** Only present where retrying can plausibly succeed (B043) — an expired
   * reservation is never retryable, it needs a new selection instead. */
  actionLabel?: string;
}

// Never a raw error code or stack trace to a student (SECURITY.md). Admins
// may additionally be shown a correlation ID by the caller, appended
// separately — never baked into this preset text.
const PRESETS: Record<ErrorStateVariant, ErrorPreset> = {
  network: {
    icon: "wifi_off",
    title: "Koneksi terputus",
    description: "Periksa koneksi internet Anda dan coba lagi.",
    actionLabel: "Coba Lagi",
  },
  server: {
    icon: "error",
    title: "Terjadi kesalahan",
    description: "Silakan coba lagi dalam beberapa saat.",
    actionLabel: "Coba Lagi",
  },
  "not-found": {
    icon: "search_off",
    title: "Tidak ditemukan",
    description: "Data yang Anda cari tidak tersedia.",
  },
  forbidden: {
    icon: "lock",
    title: "Akses ditolak",
    description: "Anda tidak memiliki izin untuk mengakses halaman ini.",
  },
  expired: {
    icon: "timer_off",
    title: "Reservasi telah berakhir",
    description: "Waktu reservasi Anda habis. Silakan pilih nomor lain untuk melanjutkan.",
    actionLabel: "Pilih Nomor Lain",
  },
};

export interface ErrorStateProps {
  variant: ErrorStateVariant;
  onRetry?: () => void;
  correlationId?: string;
}

export function ErrorState({ variant, onRetry, correlationId }: ErrorStateProps) {
  const preset = PRESETS[variant];
  return (
    <div role="alert" className="flex flex-col items-center gap-sm px-lg py-xl text-center">
      <span aria-hidden="true" className="material-symbols-outlined text-[48px] text-error">
        {preset.icon}
      </span>
      <p className="font-display text-title-md text-on-surface">{preset.title}</p>
      <p className="font-body text-body-sm text-on-surface-variant">{preset.description}</p>
      {preset.actionLabel && onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {preset.actionLabel}
        </Button>
      ) : null}
      {correlationId ? (
        <p className="font-body text-body-sm text-on-surface-variant">ID: {correlationId}</p>
      ) : null}
    </div>
  );
}
