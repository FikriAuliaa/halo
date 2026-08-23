"use client";

import { useEffect, useRef, useState } from "react";
import { ErrorState } from "@/components/ui/error-state";
import { useToast } from "@/hooks/use-toast";
import type { AdminRole } from "@/schemas/admin";

interface PaymentConfig {
  qr_image_url: string | null;
  payment_label: string | null;
}

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
        className="p-xl text-center font-body text-body-sm text-on-surface-variant"
      >
        Memuat konfigurasi pembayaran...
      </div>
    );
  }

  const currentQrImage = previewUrl ?? config.qr_image_url;

  return (
    <div className="flex w-full max-w-4xl flex-col gap-lg">
      {/* Header */}
      <div>
        <h2 className="font-display-lg text-display-lg tracking-tight text-on-surface">
          Konfigurasi Pembayaran
        </h2>
        {!canEdit && (
          <p className="font-body-sm mt-1 text-body-sm text-on-surface-variant">
            Hanya ADMIN_TELKOMSEL yang dapat mengubah konfigurasi pembayaran. Tampilan di bawah
            bersifat baca saja.
          </p>
        )}
      </div>

      {/* Configuration Card */}
      <div className="relative overflow-hidden rounded-xl border border-outline-variant bg-[linear-gradient(180deg,#4A0000_0%,#000000_100%)] p-lg shadow-lg">
        {/* Subtle glow effect at top */}
        <div className="pointer-events-none absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary-container/50 to-transparent" />

        <div className="space-y-xl">
          {/* QR Image Section */}
          <div>
            <h3 className="font-title-md mb-sm text-title-md text-on-surface-variant">
              QRIS Saat Ini
            </h3>
            <div className="flex flex-col items-start gap-lg sm:flex-row">
              {/* QR Display */}
              <div className="group relative flex h-48 w-48 shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-outline bg-surface-container transition-colors hover:border-primary-container">
                {currentQrImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentQrImage}
                    alt="QRIS pembayaran saat ini"
                    className="absolute inset-0 h-full w-full bg-white/5 object-contain p-2"
                  />
                ) : (
                  <div className="relative z-10 m-sm flex flex-col items-center rounded-md bg-black/60 p-sm text-center backdrop-blur-sm">
                    <span className="material-symbols-outlined mb-2 text-outline transition-colors group-hover:text-primary-container">
                      qr_code_2
                    </span>
                    <span className="font-body-sm text-body-sm text-outline transition-colors group-hover:text-on-surface">
                      QRIS pembayaran saat ini
                    </span>
                  </div>
                )}
              </div>

              {/* Upload Action */}
              {canEdit && (
                <div className="flex-1 space-y-md">
                  <div>
                    <label className="font-body-sm mb-xs block text-body-sm text-on-surface-variant">
                      Ganti Gambar QRIS (opsional)
                    </label>
                    <div className="flex items-center gap-sm">
                      <div className="relative">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        />
                        <button
                          type="button"
                          className="bg-surface-variant font-label-bold cursor-pointer rounded-lg border border-outline px-md py-sm text-label-bold text-on-surface transition-colors hover:bg-surface-bright"
                        >
                          Choose File
                        </button>
                      </div>
                      <span className="font-body-sm max-w-[200px] truncate text-body-sm italic text-on-surface-variant">
                        {file ? file.name : "no file selected"}
                      </span>
                    </div>
                    <p className="font-body-sm mt-xs text-body-sm text-xs text-outline">
                      Format yang didukung: JPG, PNG. Maksimal 2MB.
                    </p>
                  </div>

                  {file && (
                    <label className="font-body-sm flex cursor-pointer select-none items-center gap-sm rounded-lg border border-primary-container/40 bg-primary-container/10 p-sm text-body-sm text-on-surface">
                      <input
                        type="checkbox"
                        checked={scanConfirmed}
                        onChange={(e) => setScanConfirmed(e.target.checked)}
                        className="form-checkbox h-4 w-4 rounded border-outline-variant bg-surface-container-lowest text-primary-container"
                      />
                      <span>
                        Saya telah memindai kode QR baru ini dan memastikannya berfungsi dengan
                        benar.
                      </span>
                    </label>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="h-px w-full bg-[#2A2A2A]" />

          {/* Label Input Section */}
          <div>
            <label className="font-body-sm mb-xs block text-body-sm text-[#A0A0A0]">
              Label Pembayaran
            </label>
            <div className="relative rounded-lg border-b-2 border-transparent bg-[#2A2A2A] transition-colors focus-within:border-primary-container">
              <input
                type="text"
                disabled={!canEdit}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Masukkan label pembayaran"
                className="font-body-lg w-full border-none bg-transparent px-md py-sm text-body-lg text-on-surface placeholder-outline-variant focus:outline-none focus:ring-0 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Action Area */}
          {canEdit && (
            <div className="flex justify-end pt-sm">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || !label.trim() || (file !== null && !scanConfirmed)}
                className="font-label-bold cursor-pointer rounded-full bg-primary-container px-xl py-sm text-label-bold text-on-primary-container shadow-[0_0_15px_rgba(237,2,38,0.3)] transition-all hover:bg-primary-container/90 hover:shadow-[0_0_20px_rgba(237,2,38,0.5)] active:scale-95 disabled:opacity-40"
              >
                {saving ? "Memproses..." : "Simpan"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
