"use client";

import { useEffect, useRef, useState } from "react";
import { useCountdown } from "@/hooks/use-countdown";
import { ProgressBar } from "@/components/ui/progress-bar";

export interface ReservationTimerProps {
  reservedAt: Date;
  reservedUntil: Date;
  onExpire?: () => void;
  /** Clock-offset-corrected `now()` from `useReservation` (B074) — a
   * device with a wrong clock still counts down accurately. Defaults to
   * the uncorrected `Date.now` when the caller has no offset yet. */
  now?: () => number;
}

const ERROR_THRESHOLD_MS = 2 * 60_000;
const ANNOUNCE_THRESHOLDS_MS = [5 * 60_000, 2 * 60_000, 30_000];

function formatMmSs(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Server-anchored countdown, visible on screens 1-4 once a reservation is
 * active (DESIGN.md §8 — the timer the reference design does not contain,
 * C6). This component is presentation only: `onExpire` triggers a server
 * revalidation in the parent, it never itself releases anything.
 */
export function ReservationTimer({
  reservedAt,
  reservedUntil,
  onExpire,
  now,
}: ReservationTimerProps) {
  const { remainingMs, expired } = useCountdown({ reservedUntil, onExpire, now });
  const totalMs = Math.max(1, reservedUntil.getTime() - reservedAt.getTime());
  const percent = (remainingMs / totalMs) * 100;
  const tone = remainingMs <= ERROR_THRESHOLD_MS ? "error" : "default";

  const [announcement, setAnnouncement] = useState("");
  const announcedRef = useRef(new Set<number>());

  useEffect(() => {
    for (const threshold of ANNOUNCE_THRESHOLDS_MS) {
      if (remainingMs <= threshold && !announcedRef.current.has(threshold)) {
        announcedRef.current.add(threshold);
        setAnnouncement(`${formatMmSs(threshold)} tersisa untuk menyelesaikan pesanan.`);
      }
    }
  }, [remainingMs]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="font-body text-body-sm text-on-surface-variant">
          {expired ? "Reservasi berakhir" : "Waktu tersisa"}
        </span>
        <span
          className={`font-display text-label-bold ${tone === "error" ? "text-error" : "text-on-surface"}`}
        >
          {formatMmSs(remainingMs)}
        </span>
      </div>
      <ProgressBar percent={percent} tone={tone} aria-label="Sisa waktu reservasi" />
      {/* polite, not assertive — must never interrupt a screen-reader user
          mid-field (DESIGN.md §8, B038). */}
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}
