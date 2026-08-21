"use client";

import { useState } from "react";
import { Dialog } from "./dialog";
import { Button, type ButtonVariant } from "./button";
import { TextField } from "./text-field";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  onConfirm: () => void | Promise<void>;
  /** For irreversible operations — student must type this exact phrase to enable confirm. */
  typedConfirmationPhrase?: string;
}

/**
 * Destructive-action confirmation for the admin panel (mark sold offline,
 * reject an order, etc.). Defaults to the safe choice — the destructive
 * button is never auto-focused. Escape is blocked while the confirm action
 * is in flight (DESIGN.md §8, B039).
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  confirmVariant = "destructive",
  onConfirm,
  typedConfirmationPhrase,
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false);
  const [typedValue, setTypedValue] = useState("");

  const requiresTypedConfirmation = Boolean(typedConfirmationPhrase);
  const typedMatches = !requiresTypedConfirmation || typedValue === typedConfirmationPhrase;

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setLoading(false);
      setTypedValue("");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      {...(description !== undefined ? { description } : {})}
      preventClose={loading}
    >
      {requiresTypedConfirmation ? (
        <div className="mb-md">
          <TextField
            label={`Ketik "${typedConfirmationPhrase}" untuk melanjutkan`}
            value={typedValue}
            onChange={(e) => setTypedValue(e.target.value)}
            disabled={loading}
          />
        </div>
      ) : null}
      <div className="flex justify-end gap-sm">
        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={confirmVariant}
          onClick={handleConfirm}
          loading={loading}
          disabled={!typedMatches}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
