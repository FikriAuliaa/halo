"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/hooks/use-toast";
import type { AdminRole } from "@/schemas/admin";

interface PaymentConfig {
  qr_image_url: string | null;
  payment_label: string | null;
}

/**
 * `/admin/konfigurasi/pembayaran` (B111, OQ-6). A broken QRIS silently
 * breaks every payment until a student complains, so replacing the image
 * is deliberately friction-full: pick a file, see a live preview of
 * *that* file (not the one already live), and only then is the "I've
 * scanned this and it works" checkbox available to enable the save —
 * ticking it without picking a new file does nothing, since there'd be
 * nothing new to have scanned.
 */
export function PaymentConfigClient({ role }: { role: AdminRole }) {
  const { showToast } = useToast();
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [state, setState] = useState<"loading" | "idle" | "error">("loading");
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanConfirmed, setScanConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEdit = role === "ADMIN_TELKOMSEL";

  async function load() {
    setState("loading");
    try {
      const res = await fetch("/api/admin/config/payment");
      if (!res.ok) throw new Error("failed");
      const body = (await res.json()) as PaymentConfig;
      setConfig(body);
      setLabel(body.payment_label ?? "");
      setState("idle");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleFileChange(selected: File | null) {
    setFile(selected);
    setScanConfirmed(false);
  }

  async function handleSave() {
    if (file && !scanConfirmed) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("payment_label", label);
      formData.set("scan_confirmed", String(scanConfirmed));
      if (file) formData.set("qr_image", file);

      const res = await fetch("/api/admin/config/payment", { method: "POST", body: formData });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast("error", body?.error?.message ?? "Gagal menyimpan konfigurasi pembayaran.");
        return;
      }
      showToast("success", "Konfigurasi pembayaran disimpan.");
      setFile(null);
      setScanConfirmed(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (state === "error") return <ErrorState variant="server" onRetry={() => void load()} />;
  if (state === "loading" || !config) {
    return (
      <div
        role="status"
        aria-busy="true"
        className="font-body text-body-sm text-on-surface-variant"
      >
        Memuat…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="font-display text-headline-lg text-on-surface">Konfigurasi Pembayaran</h1>

      {!canEdit ? (
        <p className="font-body text-body-sm text-on-surface-variant">
          Hanya ADMIN_TELKOMSEL yang dapat mengubah konfigurasi pembayaran. Tampilan di bawah
          bersifat baca saja.
        </p>
      ) : null}

      <Card className="flex flex-col gap-md">
        <div className="flex flex-col gap-sm md:flex-row md:items-start">
          <div className="flex flex-col gap-1">
            <span className="font-body text-body-sm text-on-surface-variant">QRIS Saat Ini</span>
            {config.qr_image_url ? (
              // Remote, admin-controlled asset — same reasoning as
              // `qris-panel.tsx`'s identical choice.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={config.qr_image_url}
                alt="QRIS pembayaran saat ini"
                width={200}
                height={200}
                className="rounded-card border border-outline-variant"
              />
            ) : (
              <p className="font-body text-body-sm text-on-surface-variant">
                Belum ada gambar QRIS.
              </p>
            )}
          </div>
          {previewUrl ? (
            <div className="flex flex-col gap-1">
              <span className="font-body text-body-sm text-primary">Pratinjau QRIS Baru</span>
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview, next/image can't optimize it */}
              <img
                src={previewUrl}
                alt="Pratinjau QRIS baru"
                width={200}
                height={200}
                className="rounded-card border border-primary"
              />
            </div>
          ) : null}
        </div>

        {canEdit ? (
          <>
            <label className="flex flex-col gap-1">
              <span className="font-body text-body-sm text-on-surface-variant">
                Ganti Gambar QRIS (opsional)
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                className="font-body text-body-sm text-on-surface"
              />
            </label>

            {file ? (
              <label className="flex items-center gap-xs font-body text-body-sm text-on-surface">
                <input
                  type="checkbox"
                  checked={scanConfirmed}
                  onChange={(e) => setScanConfirmed(e.target.checked)}
                />
                Saya telah memindai kode QR baru ini dan memastikannya berfungsi dengan benar.
              </label>
            ) : null}

            <TextField
              label="Label Pembayaran"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />

            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={() => void handleSave()}
                loading={saving}
                disabled={!label.trim() || (file !== null && !scanConfirmed)}
              >
                Simpan
              </Button>
            </div>
          </>
        ) : null}
      </Card>
    </div>
  );
}
