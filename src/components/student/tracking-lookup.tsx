"use client";

import { useState } from "react";
import { StudentShell } from "./student-shell";
import { TextField } from "@/components/ui/text-field";
import { Button } from "@/components/ui/button";
import { Card, CardDivider } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { OrderStatusBadge } from "@/components/ui/status-badge";
import { formatDateTimeJakarta } from "@/lib/format";
import type { OrderStatus } from "@/domain/status";

interface TrackingResult {
  status: OrderStatus;
  number: string;
  package_label: string;
  submitted_at: string;
  verified_at: string | null;
  admin_note?: string;
}

/** `/lacak` (B071's routing skeleton; `getTrackingStatus` per API_SPEC.md) —
 * standalone, no reservation guard: a student may look up a past order
 * long after their reservation itself has ended. */
export function TrackingLookup() {
  const [orderRef, setOrderRef] = useState("");
  const [trackingToken, setTrackingToken] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "not-found" | "error">("idle");
  const [result, setResult] = useState<TrackingResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setResult(null);
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_ref: orderRef.trim(), tracking_token: trackingToken.trim() }),
      });
      if (res.status === 404) {
        setStatus("not-found");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        return;
      }
      const body = (await res.json()) as TrackingResult;
      setResult(body);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <StudentShell>
      <div className="flex flex-col gap-lg">
        <div className="flex flex-col gap-xs">
          <h1 className="font-display text-headline-lg-mobile text-on-surface md:text-headline-lg">
            Lacak Pesanan
          </h1>
          <p className="font-body text-body-sm text-on-surface-variant">
            Masukkan kode pemesanan dan token pelacakan yang kamu terima.
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-md">
          <TextField
            label="Kode Pemesanan"
            required
            value={orderRef}
            onChange={(e) => setOrderRef(e.target.value)}
            placeholder="HALO-XXXXXXXXX"
          />
          <TextField
            label="Token Pelacakan"
            required
            value={trackingToken}
            onChange={(e) => setTrackingToken(e.target.value)}
          />
          <Button type="submit" variant="primary" size="lg" loading={status === "loading"}>
            Lacak
          </Button>
        </form>

        {status === "not-found" ? (
          <ErrorState variant="not-found" />
        ) : status === "error" ? (
          <ErrorState variant="server" onRetry={() => setStatus("idle")} />
        ) : null}

        {result ? (
          <Card className="flex flex-col gap-sm">
            <div className="flex items-center justify-between">
              <span className="font-body text-body-sm text-on-surface-variant">Status</span>
              <OrderStatusBadge status={result.status} />
            </div>
            <CardDivider />
            <div className="flex items-center justify-between">
              <span className="font-body text-body-sm text-on-surface-variant">Nomor</span>
              <span className="font-display text-title-md text-on-surface">{result.number}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-body text-body-sm text-on-surface-variant">Paket</span>
              <span className="font-body text-body-lg text-on-surface">{result.package_label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-body text-body-sm text-on-surface-variant">Diajukan</span>
              <span className="font-body text-body-sm text-on-surface">
                {formatDateTimeJakarta(new Date(result.submitted_at))}
              </span>
            </div>
            {result.verified_at ? (
              <div className="flex items-center justify-between">
                <span className="font-body text-body-sm text-on-surface-variant">Diverifikasi</span>
                <span className="font-body text-body-sm text-on-surface">
                  {formatDateTimeJakarta(new Date(result.verified_at))}
                </span>
              </div>
            ) : null}
            {result.admin_note ? (
              <>
                <CardDivider />
                <p className="font-body text-body-sm text-on-surface-variant">
                  {result.admin_note}
                </p>
              </>
            ) : null}
          </Card>
        ) : null}
      </div>
    </StudentShell>
  );
}
