"use client";

import { useState } from "react";
import { ErrorState } from "@/components/ui/error-state";

export interface QrisPanelProps {
  qrImageUrl: string | null;
  paymentLabel: string;
}

/**
 * The QR must scan reliably from another device's camera (B081) — never
 * below 200px, adequate quiet-zone padding via the panel's own padding,
 * and it does not shrink on small screens. Missing config is an explicit
 * error state, not a broken `<img>`.
 */
export function QrisPanel({ qrImageUrl, paymentLabel }: QrisPanelProps) {
  const [downloading, setDownloading] = useState(false);

  if (!qrImageUrl) {
    return <ErrorState variant="server" />;
  }
  const imageUrl = qrImageUrl;

  async function handleDownload() {
    setDownloading(true);
    try {
      // A plain `<a download href={qrImageUrl}>` doesn't work: `download`
      // is ignored by every browser for a cross-origin URL (this image
      // lives in Supabase Storage, a different origin from the app even
      // in local dev) — clicking it just opened the image instead of
      // saving it. Fetching it ourselves and pointing the link at a
      // same-origin `blob:` URL is the actual fix.
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = "qris-halo.png";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fall back to opening the image directly — the user can still
      // save it manually (e.g. long-press on mobile), better than the
      // button silently doing nothing.
      window.open(imageUrl, "_blank");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-sm rounded-card border border-outline-variant bg-surface-container p-lg">
      <p className="font-body text-body-sm text-on-surface-variant">{paymentLabel}</p>
      {/* Remote, admin-controlled asset — not a build-time-known static
          import, so next/image's optimizer offers little here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrImageUrl}
        alt={`Kode QRIS untuk ${paymentLabel}`}
        className="h-auto w-full min-w-[200px] max-w-[280px]"
        width={280}
        height={280}
      />
      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={downloading}
        className="font-body text-body-sm text-secondary underline underline-offset-2 disabled:opacity-50"
      >
        {downloading ? "Menyimpan…" : "Simpan QR"}
      </button>
    </div>
  );
}
