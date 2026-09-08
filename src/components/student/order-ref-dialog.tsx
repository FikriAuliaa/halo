"use client";

import { Dialog } from "@/components/ui/dialog";
import { CopyButton } from "@/components/ui/copy-button";
import { Button } from "@/components/ui/button";

export interface OrderRefDialogProps {
  open: boolean;
  orderRef: string;
  onContinue: () => void;
}

export function OrderRefDialog({ open, orderRef, onContinue }: OrderRefDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={() => {}}
      preventClose
      title="Kode Pemesanan Kamu"
      description="Gunakan kode pemesanan ini untuk pembayaran dan melacak status pesanan kamu."
    >
      <div className="flex flex-col gap-md">
        <div className="flex flex-col items-center justify-between gap-sm rounded-field border border-outline-variant/30 bg-surface-container-lowest px-md py-md sm:flex-row">
          <span className="font-body text-body-sm text-on-surface-variant">Kode Pemesanan</span>
          <span className="font-display text-title-md font-bold tracking-wider text-primary">
            {orderRef}
          </span>
        </div>
        <CopyButton value={orderRef} label="Salin Kode Pemesanan" />
        <p className="text-center font-body text-body-sm text-on-surface-variant">
          Kode ini dibuat menggunakan nomor HP kamu agar mudah diingat.
        </p>
        <Button variant="primary" size="lg" onClick={onContinue}>
          Lanjut Pilih Paket
        </Button>
      </div>
    </Dialog>
  );
}
