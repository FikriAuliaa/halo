"use client";

import { useEffect, useState } from "react";
import { ErrorState } from "@/components/ui/error-state";
import { formatCurrencyIDR } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import type { AdminRole } from "@/schemas/admin";
import type { PackageEntry } from "@/server/db/types";

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item as T);
  return copy.map((entry, i) => ({ ...entry, display_order: i }) as T);
}

export function PackagesConfigClient({ role }: { role: AdminRole }) {
  const { showToast } = useToast();
  const [packages, setPackages] = useState<PackageEntry[]>([]);
  const [state, setState] = useState<"loading" | "idle" | "error">("loading");
  const [saving, setSaving] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  async function load() {
    setState("loading");
    try {
      const res = await fetch("/api/admin/config/packages");
      if (!res.ok) throw new Error("failed");
      const body = await res.json();
      setPackages(
        (body.packages ?? [])
          .slice()
          .sort((a: PackageEntry, b: PackageEntry) => a.display_order - b.display_order),
      );
      setState("idle");
      setDirty(false);
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function updatePackage(id: string, patch: Partial<PackageEntry>) {
    setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    setDirty(true);
  }

  function reorder(index: number, direction: -1 | 1) {
    setPackages((prev) => moveItem(prev, index, index + direction));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/config/packages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packages }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast("error", body?.error?.message ?? "Gagal menyimpan perubahan.");
        return;
      }
      for (const warning of body.warnings ?? []) {
        showToast(
          "error",
          `Paket ${warning.id} dinonaktifkan tetapi masih memiliki ${warning.affected_pending_orders} pesanan menunggu pembayaran.`,
        );
      }
      showToast("success", "Perubahan paket disimpan.");
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmPrice(id: string) {
    setConfirmingId(id);
    try {
      const res = await fetch(`/api/admin/config/packages/${id}/confirm-price`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast("error", body?.error?.message ?? "Gagal mengonfirmasi harga.");
        return;
      }
      showToast("success", "Harga paket dikonfirmasi.");
      await load();
    } finally {
      setConfirmingId(null);
    }
  }

  const canEditPrice = role === "ADMIN_TELKOMSEL";

  if (state === "error") return <ErrorState variant="server" onRetry={() => void load()} />;
  if (state === "loading") {
    return (
      <div
        role="status"
        aria-busy="true"
        className="p-xl text-center font-body text-body-sm text-on-surface-variant"
      >
        Memuat data paket...
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-lg">
      {/* Header Actions */}
      <div className="mb-md flex flex-col items-start justify-between gap-md sm:flex-row sm:items-center">
        <div>
          <h2 className="font-headline-lg mb-1 text-headline-lg text-on-surface">
            Konfigurasi Paket
          </h2>
          <p className="font-body-sm text-on-surface-variant">
            Manage data packages and roaming plans.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!dirty || saving}
          className="font-title-md flex cursor-pointer items-center gap-xs rounded-full bg-primary-container px-lg py-sm text-title-md text-on-primary-container shadow-lg transition-all hover:bg-primary-container/90 active:scale-95 disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-[20px]">save</span>
          {saving ? "Memproses..." : "Simpan Perubahan"}
        </button>
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 gap-md xl:grid-cols-2">
        {packages.map((pkg, index) => (
          <div
            key={pkg.id}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-white/5 bg-gradient-to-b from-[rgba(74,0,0,0.4)] to-[rgba(0,0,0,0.6)] p-md shadow-lg backdrop-blur-md"
          >
            {/* Decorative Top Glow */}
            <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-primary-container to-transparent opacity-50 transition-opacity group-hover:opacity-100" />

            <div className="border-surface-variant mb-md flex items-center justify-between border-b pb-sm">
              <h3 className="font-title-md text-primary-fixed text-title-md">{pkg.id}</h3>
              <div className="flex gap-xs text-on-surface-variant">
                <button
                  type="button"
                  onClick={() => reorder(index, -1)}
                  disabled={index === 0}
                  aria-label="Naikkan urutan"
                  className="transition-colors hover:text-primary disabled:opacity-30"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
                </button>
                <button
                  type="button"
                  onClick={() => reorder(index, 1)}
                  disabled={index === packages.length - 1}
                  aria-label="Turunkan urutan"
                  className="transition-colors hover:text-primary disabled:opacity-30"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_downward</span>
                </button>
              </div>
            </div>

            <div className="mb-md grid grid-cols-1 gap-md md:grid-cols-2">
              {/* Field: Label */}
              <div className="flex flex-col">
                <label className="mb-xs text-label-bold text-outline">Label</label>
                <input
                  type="text"
                  value={pkg.label}
                  onChange={(e) => updatePackage(pkg.id, { label: e.target.value })}
                  className="font-body-lg w-full rounded-lg border-b-2 border-none border-transparent bg-[#2A2A2A] p-sm text-on-surface transition-all focus:border-b-primary-container focus:bg-[#333333] focus:outline-none"
                />
              </div>

              {/* Field: Harga */}
              <div className="relative flex flex-col">
                <label className="mb-xs text-label-bold text-outline">
                  Harga ({pkg.price_status === "confirmed" ? "terkonfirmasi" : "draft"})
                </label>
                <div className="flex items-center">
                  <span className="absolute left-sm text-on-surface-variant">Rp</span>
                  <input
                    type="number"
                    value={pkg.price}
                    disabled={!canEditPrice}
                    onChange={(e) => updatePackage(pkg.id, { price: Number(e.target.value) })}
                    className="font-body-lg w-full rounded-l-lg border-b-2 border-none border-transparent bg-[#2A2A2A] p-sm pl-8 text-on-surface transition-all focus:border-b-primary-container focus:bg-[#333333] focus:outline-none disabled:opacity-50"
                  />
                  {pkg.price_status === "draft" && canEditPrice ? (
                    <button
                      type="button"
                      disabled={confirmingId === pkg.id}
                      onClick={() => void handleConfirmPrice(pkg.id)}
                      className="bg-surface-variant shrink-0 cursor-pointer rounded-r-lg border border-transparent px-sm py-[10px] text-body-sm font-bold text-on-surface transition-colors hover:border-primary-container disabled:opacity-40"
                    >
                      {confirmingId === pkg.id ? "…" : "Konfirmasi"}
                    </button>
                  ) : (
                    <span className="text-status-success shrink-0 rounded-r-lg border border-outline-variant bg-surface-container-high px-sm py-[10px] text-body-sm font-bold">
                      ✓ Confirm
                    </span>
                  )}
                </div>
                <span className="ml-1 mt-1 text-[10px] text-on-surface-variant">
                  {formatCurrencyIDR(pkg.price)}
                </span>
              </div>
            </div>

            <div className="mb-md grid grid-cols-2 gap-x-md gap-y-sm">
              {/* Kuota Internet */}
              <div className="flex flex-col">
                <label className="mb-xs text-label-bold text-outline">Kuota Internet (GB)</label>
                <input
                  type="number"
                  value={pkg.quota_internet_gb}
                  onChange={(e) =>
                    updatePackage(pkg.id, { quota_internet_gb: Number(e.target.value) })
                  }
                  className="font-body-lg w-full rounded-lg border-b-2 border-none border-transparent bg-[#2A2A2A] p-sm text-on-surface transition-all focus:border-b-primary-container focus:bg-[#333333] focus:outline-none"
                />
              </div>

              {/* Kuota Roaming */}
              <div className="flex flex-col">
                <label className="mb-xs text-label-bold text-outline">Kuota Roaming (GB)</label>
                <input
                  type="number"
                  value={pkg.quota_roaming_gb}
                  onChange={(e) =>
                    updatePackage(pkg.id, { quota_roaming_gb: Number(e.target.value) })
                  }
                  className="font-body-lg w-full rounded-lg border-b-2 border-none border-transparent bg-[#2A2A2A] p-sm text-on-surface transition-all focus:border-b-primary-container focus:bg-[#333333] focus:outline-none"
                />
              </div>

              {/* Menit Telepon */}
              <div className="flex flex-col">
                <label className="mb-xs text-label-bold text-outline">Menit Telepon</label>
                <input
                  type="number"
                  value={pkg.voice_minutes}
                  onChange={(e) => updatePackage(pkg.id, { voice_minutes: Number(e.target.value) })}
                  className="font-body-lg w-full rounded-lg border-b-2 border-none border-transparent bg-[#2A2A2A] p-sm text-on-surface transition-all focus:border-b-primary-container focus:bg-[#333333] focus:outline-none"
                />
              </div>

              {/* SMS */}
              <div className="flex flex-col">
                <label className="mb-xs text-label-bold text-outline">SMS</label>
                <input
                  type="number"
                  value={pkg.sms_count}
                  onChange={(e) => updatePackage(pkg.id, { sms_count: Number(e.target.value) })}
                  className="font-body-lg w-full rounded-lg border-b-2 border-none border-transparent bg-[#2A2A2A] p-sm text-on-surface transition-all focus:border-b-primary-container focus:bg-[#333333] focus:outline-none"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="border-surface-variant mt-auto flex flex-row gap-md border-t pt-sm">
              <label className="flex cursor-pointer select-none items-center">
                <input
                  type="checkbox"
                  checked={pkg.recommended}
                  onChange={(e) => updatePackage(pkg.id, { recommended: e.target.checked })}
                  className="peer sr-only"
                />
                <div className="border-surface-variant peer relative h-6 w-10 rounded-full border bg-surface-container-highest transition-all after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-secondary-container peer-checked:after:translate-x-4" />
                <span className="font-body-lg ml-sm text-body-sm text-on-surface">
                  Direkomendasikan
                </span>
              </label>

              <label className="flex cursor-pointer select-none items-center">
                <input
                  type="checkbox"
                  checked={pkg.active}
                  onChange={(e) => updatePackage(pkg.id, { active: e.target.checked })}
                  className="peer sr-only"
                />
                <div className="border-surface-variant peer relative h-6 w-10 rounded-full border bg-surface-container-highest transition-all after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#68D391] peer-checked:after:translate-x-4" />
                <span className="font-body-lg ml-sm text-body-sm text-on-surface">Aktif</span>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
