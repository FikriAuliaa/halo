"use client";

import { Dialog } from "@/components/ui/dialog";
import { CopyButton } from "@/components/ui/copy-button";
import { Button } from "@/components/ui/button";

export interface TrackingTokenDialogProps {
  open: boolean;
  orderRef: string;
  trackingToken: string;
  onContinue: () => void;
}

/**
 * Shown exactly once, right after a successful reservation (B088's
 * "shown only once — save it" requirement) — this is the only moment the
 * plaintext tracking token ever exists client-side; it's never persisted
 * (not `sessionStorage`, per B079/AGENTS.md) and cryptographically
 * unrecoverable afterward (only its hash is stored, B062). `preventClose`
 * so it can't be dismissed by an accidental tap outside it.
 */
export function TrackingTokenDialog({
  open,
  orderRef,
  trackingToken,
  onContinue,
}: TrackingTokenDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={() => {}}
      preventClose
      title="Simpan Kode Pelacakan Kamu"
      description="Kode ini hanya ditampilkan sekali dan tidak dapat diminta ulang."
    >
      <div className="flex flex-col gap-md">
        <div className="flex items-center justify-between rounded-field bg-surface-container-lowest px-sm py-sm">
          <span className="font-body text-body-sm text-on-surface-variant">Kode Pemesanan</span>
          <span className="font-display text-title-md text-on-surface">{orderRef}</span>
        </div>
        <div className="flex items-center justify-between gap-sm rounded-field bg-surface-container-lowest px-sm py-sm">
          <span className="font-body text-body-sm text-on-surface-variant">Token Pelacakan</span>
          <span className="break-all font-display text-body-sm text-on-surface">
            {trackingToken}
          </span>
        </div>
        <CopyButton value={`${orderRef} / ${trackingToken}`} label="Salin Kode & Token" />
        <p role="alert" className="font-body text-body-sm text-error">
          Simpan kedua kode ini sekarang — token tidak dapat ditampilkan ulang setelah kamu
          melanjutkan.
        </p>
        <Button variant="primary" size="lg" onClick={onContinue}>
          Saya Sudah Menyimpannya, Lanjutkan
        </Button>
      </div>
    </Dialog>
  );
}
