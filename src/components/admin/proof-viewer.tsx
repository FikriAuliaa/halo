"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export interface ProofViewerProps {
  orderId: string;
}

/**
 * Mints a fresh signed URL on mount (B103) — never cached or stored
 * beyond this component's lifetime. Zoom/rotate are pure CSS transforms;
 * a failed image load degrades to a retry affordance rather than
 * breaking the page.
 */
export function ProofViewer({ orderId }: ProofViewerProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  async function loadUrl() {
    setError(false);
    setUrl(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/proof-url`, { method: "POST" });
      if (!res.ok) throw new Error("failed");
      const body = await res.json();
      setUrl(body.url);
    } catch {
      setError(true);
    }
  }

  useEffect(() => {
    void loadUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  return (
    <div className="flex flex-col gap-sm">
      <div className="flex items-center gap-sm">
        <Button variant="ghost" size="sm" onClick={() => setZoom((z) => Math.min(z + 0.5, 3))}>
          Perbesar
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setZoom((z) => Math.max(z - 0.5, 1))}>
          Perkecil
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setRotation((r) => (r + 90) % 360)}>
          Putar
        </Button>
      </div>

      <div
        className="overflow-auto rounded-card border border-outline-variant bg-surface-container-lowest p-sm"
        style={{ maxHeight: 480 }}
      >
        {error ? (
          <div className="flex flex-col items-center gap-sm py-xl">
            <p className="font-body text-body-sm text-error">Gagal memuat bukti pembayaran.</p>
            <Button variant="secondary" size="sm" onClick={() => void loadUrl()}>
              Coba Lagi
            </Button>
          </div>
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="Bukti pembayaran"
            onError={() => setError(true)}
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transition: "transform 150ms",
            }}
            className="mx-auto max-w-full"
          />
        ) : (
          <div
            role="status"
            aria-busy="true"
            className="py-xl text-center font-body text-body-sm text-on-surface-variant"
          >
            Memuat bukti pembayaran…
          </div>
        )}
      </div>
    </div>
  );
}
