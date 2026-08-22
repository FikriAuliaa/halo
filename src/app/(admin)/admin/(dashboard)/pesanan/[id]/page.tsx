"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardDivider } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/text-field";
import { ErrorState } from "@/components/ui/error-state";
import { ProofViewer } from "@/components/admin/proof-viewer";
import { useToast } from "@/hooks/use-toast";
import { formatCurrencyIDR, formatDateTimeJakarta } from "@/lib/format";
import { formatPhoneDisplay } from "@/domain/phone";

interface OrderDetail {
  id: string;
  order_ref: string;
  number: string;
  full_name: string;
  university: string;
  whatsapp: string;
  email: string;
  package_label: string;
  price_at_order: number;
  status: "pending" | "verified" | "rejected";
  submitted_at: string;
  verified_at: string | null;
  admin_note: string | null;
}

/** Order detail + verify/reject (B103/B104). Deliberately no optimistic
 * UI on either action — an irreversible financial decision waits for the
 * server's actual answer before the screen changes (B104's own explicit
 * constraint). */
export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  async function loadOrder() {
    setStatus("loading");
    try {
      const res = await fetch(`/api/admin/orders/${params.id}`);
      if (!res.ok) throw new Error("failed");
      setOrder(await res.json());
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    void loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleVerify() {
    const res = await fetch(`/api/admin/orders/${params.id}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idempotency_key: crypto.randomUUID() }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      showToast("error", body?.error?.message ?? "Gagal memverifikasi pesanan.");
      return;
    }
    showToast("success", "Pesanan berhasil diverifikasi.");
    await loadOrder();
  }

  async function handleReject() {
    if (!rejectNote.trim()) return;
    setRejectLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${params.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_note: rejectNote, idempotency_key: crypto.randomUUID() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showToast("error", body?.error?.message ?? "Gagal menolak pesanan.");
        return;
      }
      showToast("success", "Pesanan ditolak.");
      setRejectOpen(false);
      setRejectNote("");
      await loadOrder();
    } finally {
      setRejectLoading(false);
    }
  }

  if (status === "error") {
    return <ErrorState variant="server" onRetry={() => void loadOrder()} />;
  }
  if (status === "loading" || !order) {
    return (
      <div
        role="status"
        aria-busy="true"
        className="p-md font-body text-body-sm text-on-surface-variant"
      >
        Memuat…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-headline-lg text-on-surface">{order.order_ref}</h1>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
        <div className="flex flex-col gap-md">
          <Card className="flex flex-col gap-sm">
            <h2 className="font-display text-title-md text-on-surface">Data Pelanggan</h2>
            <CardDivider />
            <div className="flex items-center justify-between">
              <span className="font-body text-body-sm text-on-surface-variant">Nama</span>
              <span className="font-body text-body-lg text-on-surface">{order.full_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-body text-body-sm text-on-surface-variant">Universitas</span>
              <span className="font-body text-body-lg text-on-surface">{order.university}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-body text-body-sm text-on-surface-variant">WhatsApp</span>
              <span className="font-body text-body-lg text-on-surface">{order.whatsapp}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-body text-body-sm text-on-surface-variant">Email</span>
              <span className="font-body text-body-lg text-on-surface">{order.email}</span>
            </div>
          </Card>

          <Card className="flex flex-col gap-sm">
            <h2 className="font-display text-title-md text-on-surface">Pesanan</h2>
            <CardDivider />
            <div className="flex items-center justify-between">
              <span className="font-body text-body-sm text-on-surface-variant">Nomor</span>
              <span className="font-display text-title-md text-on-surface">
                {formatPhoneDisplay(order.number)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-body text-body-sm text-on-surface-variant">Paket</span>
              <span className="font-body text-body-lg text-on-surface">{order.package_label}</span>
            </div>
            {/* Expected amount, adjacent to the proof (B103) — with a
                single static QRIS, eyeballing this comparison is the
                only underpayment check that exists. */}
            <div className="flex items-center justify-between">
              <span className="font-body text-body-sm text-on-surface-variant">
                Jumlah yang Diharapkan
              </span>
              <span className="font-display text-title-md text-primary">
                {formatCurrencyIDR(order.price_at_order)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-body text-body-sm text-on-surface-variant">Diajukan</span>
              <span className="font-body text-body-sm text-on-surface">
                {formatDateTimeJakarta(new Date(order.submitted_at))}
              </span>
            </div>
            {order.verified_at ? (
              <div className="flex items-center justify-between">
                <span className="font-body text-body-sm text-on-surface-variant">Diproses</span>
                <span className="font-body text-body-sm text-on-surface">
                  {formatDateTimeJakarta(new Date(order.verified_at))}
                </span>
              </div>
            ) : null}
            {order.admin_note ? (
              <>
                <CardDivider />
                <p className="font-body text-body-sm text-on-surface-variant">{order.admin_note}</p>
              </>
            ) : null}
          </Card>

          {order.status === "pending" ? (
            <div className="flex gap-sm">
              <Button variant="primary" size="md" onClick={() => setVerifyOpen(true)}>
                Verifikasi Pembayaran
              </Button>
              <Button variant="destructive" size="md" onClick={() => setRejectOpen(true)}>
                Tolak Pembayaran
              </Button>
            </div>
          ) : null}
        </div>

        <ProofViewer orderId={order.id} />
      </div>

      <ConfirmDialog
        open={verifyOpen}
        onOpenChange={setVerifyOpen}
        title="Verifikasi Pembayaran"
        description="Nomor akan ditandai terjual dan tindakan ini tidak dapat dibatalkan melalui panel ini."
        confirmLabel="Verifikasi"
        confirmVariant="primary"
        onConfirm={handleVerify}
      />

      <Dialog
        open={rejectOpen}
        onOpenChange={(open) => {
          if (!rejectLoading) setRejectOpen(open);
        }}
        title="Tolak Pembayaran"
        description="Alasan ini akan dibaca oleh siswa. Nomor akan dikembalikan ke daftar tersedia."
        preventClose={rejectLoading}
      >
        <div className="flex flex-col gap-md">
          <TextField
            label="Alasan Penolakan"
            required
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            disabled={rejectLoading}
          />
          <div className="flex justify-end gap-sm">
            <Button variant="ghost" onClick={() => setRejectOpen(false)} disabled={rejectLoading}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleReject()}
              loading={rejectLoading}
              disabled={!rejectNote.trim()}
            >
              Tolak
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
