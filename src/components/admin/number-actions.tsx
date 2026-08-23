"use client";

import { useState } from "react";
import { canTransition, getEffectiveStatus } from "@/domain/number-status";
import { formatPhoneDisplay } from "@/domain/phone";
import type { AdminRole } from "@/schemas/admin";
import type { NumberRow } from "@/server/db/types";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/hooks/use-toast";

export interface NumberActionsProps {
  number: NumberRow;
  role: AdminRole;
  onChanged: () => void;
}

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const parsed = await res.json().catch(() => ({}));
    return { ok: false, message: parsed?.error?.message ?? "Gagal memproses permintaan." };
  }
  return { ok: true };
}

/**
 * Per-row destructive/corrective actions (B108). Every action shown here
 * is one the server would actually accept for this exact row and role —
 * eligibility is derived from the same rules each operation enforces
 * itself (`getEffectiveStatus`/`canTransition` for mark-sold-offline;
 * the literal guard each operation throws on otherwise), so the UI can
 * never dangle an action the API will refuse.
 */
export function NumberActions({ number, role, onChanged }: NumberActionsProps) {
  const { showToast } = useToast();
  const effective = getEffectiveStatus(number, new Date());
  const display = formatPhoneDisplay(number.number);

  const canRemove = effective === "available";
  const canMarkSoldOffline = canTransition(effective, "sold_offline", role);
  const canForceRelease = effective === "reserved" && role === "ADMIN_TELKOMSEL";
  const canRename = effective === "available" && number.reserved_at === null;

  const [removeOpen, setRemoveOpen] = useState(false);
  const [soldOpen, setSoldOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [releaseReason, setReleaseReason] = useState("");
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [correctOpen, setCorrectOpen] = useState(false);
  const [correctReason, setCorrectReason] = useState("");
  const [correctNumber, setCorrectNumber] = useState("");
  const [correctLoading, setCorrectLoading] = useState(false);
  const [renameTypedConfirm, setRenameTypedConfirm] = useState("");

  const isRenaming = canRename && correctNumber.trim().length > 0;
  const renameConfirmed = !isRenaming || renameTypedConfirm === number.number;

  async function handleRemove() {
    const result = await postDelete(`/api/admin/numbers/${number.number}`);
    if (!result.ok) {
      showToast("error", result.message ?? "Gagal menghapus nomor.");
      return;
    }
    showToast("success", `Nomor ${display} dihapus.`);
    onChanged();
  }

  async function postDelete(url: string): Promise<{ ok: boolean; message?: string }> {
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok) {
      const parsed = await res.json().catch(() => ({}));
      return { ok: false, message: parsed?.error?.message ?? "Gagal memproses permintaan." };
    }
    return { ok: true };
  }

  async function handleMarkSoldOffline() {
    const result = await postJson("/api/admin/numbers/sold-offline", {
      numbers: [number.number],
    });
    if (!result.ok) {
      showToast("error", result.message ?? "Gagal menandai nomor terjual offline.");
      return;
    }
    showToast("success", `Nomor ${display} ditandai terjual offline.`);
    onChanged();
  }

  async function handleForceRelease() {
    if (!releaseReason.trim()) return;
    setReleaseLoading(true);
    try {
      const result = await postJson(`/api/admin/numbers/${number.number}/force-release`, {
        reason: releaseReason,
      });
      if (!result.ok) {
        showToast("error", result.message ?? "Gagal melepas paksa reservasi.");
        return;
      }
      showToast("success", `Reservasi nomor ${display} dilepas paksa.`);
      setReleaseOpen(false);
      setReleaseReason("");
      onChanged();
    } finally {
      setReleaseLoading(false);
    }
  }

  async function handleCorrect() {
    if (!correctReason.trim()) return;
    setCorrectLoading(true);
    try {
      const body: { reason: string; number?: string } = { reason: correctReason };
      if (canRename && correctNumber.trim()) body.number = correctNumber.trim();
      const res = await fetch(`/api/admin/numbers/${number.number}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const parsed = await res.json().catch(() => ({}));
        showToast("error", parsed?.error?.message ?? "Gagal mengoreksi nomor.");
        return;
      }
      showToast("success", `Nomor ${display} dikoreksi.`);
      setCorrectOpen(false);
      setCorrectReason("");
      setCorrectNumber("");
      setRenameTypedConfirm("");
      onChanged();
    } finally {
      setCorrectLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-sm">
      {canRemove ? (
        <button
          type="button"
          onClick={() => setRemoveOpen(true)}
          className="font-body-sm cursor-pointer text-body-sm text-primary-container transition-colors hover:text-primary"
        >
          Hapus
        </button>
      ) : null}
      {canMarkSoldOffline ? (
        <button
          type="button"
          onClick={() => setSoldOpen(true)}
          className="font-body-sm cursor-pointer text-body-sm text-on-surface-variant transition-colors hover:text-on-surface"
        >
          Tandai Terjual Offline
        </button>
      ) : null}
      {canForceRelease ? (
        <button
          type="button"
          onClick={() => setReleaseOpen(true)}
          className="font-body-sm cursor-pointer text-body-sm text-primary-container transition-colors hover:text-primary"
        >
          Lepas Paksa
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => setCorrectOpen(true)}
        className="font-body-sm cursor-pointer text-body-sm text-on-surface-variant transition-colors hover:text-on-surface"
      >
        Koreksi
      </button>

      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title={`Hapus nomor ${display}?`}
        description="Nomor akan dihapus permanen dari inventaris. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        onConfirm={handleRemove}
      />

      <ConfirmDialog
        open={soldOpen}
        onOpenChange={setSoldOpen}
        title={`Tandai ${display} terjual offline?`}
        description="Nomor akan ditandai terjual di luar sistem dan tidak lagi muncul untuk siswa."
        confirmLabel="Tandai Terjual"
        confirmVariant="primary"
        onConfirm={handleMarkSoldOffline}
      />

      <Dialog
        open={releaseOpen}
        onOpenChange={(open) => {
          if (!releaseLoading) setReleaseOpen(open);
        }}
        title={`Lepas paksa reservasi ${display}?`}
        description="Seorang siswa sedang memesan nomor ini dan akan kehilangan reservasinya. Tindakan ini tidak dapat dibatalkan."
        preventClose={releaseLoading}
      >
        <div className="flex flex-col gap-md">
          <TextField
            label="Alasan"
            required
            value={releaseReason}
            onChange={(e) => setReleaseReason(e.target.value)}
            disabled={releaseLoading}
          />
          <div className="flex justify-end gap-sm">
            <Button variant="ghost" onClick={() => setReleaseOpen(false)} disabled={releaseLoading}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleForceRelease()}
              loading={releaseLoading}
              disabled={!releaseReason.trim()}
            >
              Lepas Paksa
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={correctOpen}
        onOpenChange={(open) => {
          if (!correctLoading) {
            setCorrectOpen(open);
            if (!open) {
              setCorrectReason("");
              setCorrectNumber("");
              setRenameTypedConfirm("");
            }
          }
        }}
        title={`Koreksi nomor ${display}`}
        description={
          canRename
            ? "Nomor ini belum pernah dipesan dan dapat diganti. Mengganti nomor akan menghapus catatan lama dan membuatnya ulang di bawah nomor baru — riwayat audit sebelumnya tetap tercatat di bawah nomor lama."
            : "Nomor ini sudah pernah dipesan sehingga tidak dapat diganti — catat alasan koreksi sebagai anotasi audit."
        }
        preventClose={correctLoading}
      >
        <div className="flex flex-col gap-md">
          {canRename ? (
            <TextField
              label="Nomor Baru (opsional)"
              value={correctNumber}
              onChange={(e) => setCorrectNumber(e.target.value)}
              disabled={correctLoading}
              placeholder={number.number}
            />
          ) : null}
          <TextField
            label="Alasan"
            required
            value={correctReason}
            onChange={(e) => setCorrectReason(e.target.value)}
            disabled={correctLoading}
          />
          {isRenaming ? (
            <TextField
              label={`Ketik "${number.number}" untuk memastikan penggantian nomor`}
              value={renameTypedConfirm}
              onChange={(e) => setRenameTypedConfirm(e.target.value)}
              disabled={correctLoading}
            />
          ) : null}
          <div className="flex justify-end gap-sm">
            <Button variant="ghost" onClick={() => setCorrectOpen(false)} disabled={correctLoading}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleCorrect()}
              loading={correctLoading}
              disabled={!correctReason.trim() || !renameConfirmed}
            >
              Simpan Koreksi
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
