"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/hooks/use-toast";

export interface AddNumberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}

/** Quick single-number add (B107) — the bulk dialog handles the
 * paste-many, preview-first case; this is the one-off fast path,
 * reusing the same `adminAddNumbers` endpoint with a one-entry array. */
export function AddNumberDialog({ open, onOpenChange, onAdded }: AddNumberDialogProps) {
  const { showToast } = useToast();
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!value.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numbers: [value.trim()] }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast("error", body?.error?.message ?? "Gagal menambahkan nomor.");
        return;
      }
      const outcome = body.results?.[0];
      if (outcome?.outcome === "created") {
        showToast("success", `Nomor ${outcome.number} berhasil ditambahkan.`);
        setValue("");
        onOpenChange(false);
        onAdded();
      } else if (outcome?.outcome === "already_present") {
        showToast("error", `Nomor ${outcome.number} sudah terdaftar.`);
      } else if (outcome?.outcome === "invalid") {
        showToast("error", outcome.reason ?? "Nomor tidak valid.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!loading) onOpenChange(next);
      }}
      title="Tambah Nomor"
      description="Tambahkan satu nomor Halo ke inventaris."
      preventClose={loading}
    >
      <div className="flex flex-col gap-md">
        <TextField
          label="Nomor"
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={loading}
          placeholder="0811xxxxxxxx"
        />
        <div className="flex justify-end gap-sm">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={() => void handleSubmit()}
            loading={loading}
            disabled={!value.trim()}
          >
            Tambah
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
