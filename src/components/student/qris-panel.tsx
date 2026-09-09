"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ErrorState } from "@/components/ui/error-state";
import { makeDynamicQris } from "@/domain/qris";
import { formatCurrencyIDR } from "@/lib/format";

export interface QrisPanelProps {
  qrImageUrl: string | null;
  paymentLabel: string;
  qrisPayload?: string | null | undefined;
  totalAmount?: number | null | undefined;
}

/**
 * The QR must scan reliably from another device's camera (B081) — never
 * below 200px, adequate quiet-zone padding via the panel's own padding,
 * and it does not shrink on small screens. Supports dynamic EMVCo QRIS
 * with automatically populated transaction nominal.
 */
export function QrisPanel({ qrImageUrl, paymentLabel, qrisPayload, totalAmount }: QrisPanelProps) {
  const [downloading, setDownloading] = useState(false);
  const [dynamicQrDataUrl, setDynamicQrDataUrl] = useState<string | null>(null);
  const [isDynamic, setIsDynamic] = useState(false);

  useEffect(() => {
    let active = true;

    async function generateDynamic() {
      if (qrisPayload && totalAmount && totalAmount > 0) {
        try {
          const dynamicString = makeDynamicQris(qrisPayload, totalAmount);
          const dataUrl = await QRCode.toDataURL(dynamicString, {
            width: 320,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#ffffff",
            },
          });
          if (active) {
            setDynamicQrDataUrl(dataUrl);
            setIsDynamic(true);
          }
          return;
        } catch (err) {
          console.warn("Failed to generate dynamic QRIS, falling back to static image:", err);
        }
      }
      if (active) {
        setDynamicQrDataUrl(null);
        setIsDynamic(false);
      }
    }

    void generateDynamic();
    return () => {
      active = false;
    };
  }, [qrisPayload, totalAmount]);

  const activeImageUrl = dynamicQrDataUrl ?? qrImageUrl;

  if (!activeImageUrl) {
    return <ErrorState variant="server" />;
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      if (dynamicQrDataUrl) {
        const link = document.createElement("a");
        link.href = dynamicQrDataUrl;
        link.download = `qris-halo-${totalAmount ?? "payment"}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
      }

      if (qrImageUrl) {
        const res = await fetch(qrImageUrl);
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
      }
    } catch {
      if (qrImageUrl) {
        window.open(qrImageUrl, "_blank");
      }
    } finally {
      setDownloading(false);
    }
  }

  const displayLabel =
    !paymentLabel || paymentLabel.includes("(Placeholder)")
      ? "Silakan scan QRIS dibawah ini"
      : paymentLabel;

  return (
    <div className="flex flex-col items-center gap-sm rounded-card border border-outline-variant bg-surface-container p-lg text-center">
      <div className="flex flex-col items-center gap-1">
        <p className="font-body text-body-sm font-semibold text-on-surface">{displayLabel}</p>
        {isDynamic ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-emerald-400">
            <span className="material-symbols-outlined text-[13px]">bolt</span>
            QRIS DINAMIS • NOMINAL OTOMATIS
          </span>
        ) : null}
      </div>

      <div className="rounded-xl bg-white p-2 shadow-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeImageUrl}
          alt={`Kode QRIS untuk ${paymentLabel}`}
          className="h-auto w-full min-w-[200px] max-w-[260px]"
          width={260}
          height={260}
        />
      </div>

      {isDynamic && totalAmount ? (
        <p className="max-w-[280px] font-body text-xs text-on-surface-variant">
          Pindai dengan mobile banking atau e-wallet. Nominal{" "}
          <strong className="text-on-surface">{formatCurrencyIDR(totalAmount)}</strong> akan terisi
          otomatis.
        </p>
      ) : null}

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
