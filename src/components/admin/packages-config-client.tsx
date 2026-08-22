"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { INPUT_CLASSES } from "@/components/ui/text-field";
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

/**
 * `/admin/konfigurasi/paket` (B110). Full-document-replace model: every
 * edit accumulates in local state, and one explicit "Simpan Perubahan"
 * commits the whole array — reordering is just moving an entry in this
 * same local array before saving. Confirming a price is a separate,
 * immediate action (its own endpoint, its own button), never bundled
 * into this save, so it can't happen as a side effect of an unrelated
 * metadata edit (OQ-1).
 */
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
        className="font-body text-body-sm text-on-surface-variant"
      >
        Memuat…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-headline-lg text-on-surface">Konfigurasi Paket</h1>
        <Button
          variant="primary"
          onClick={() => void handleSave()}
          loading={saving}
          disabled={!dirty}
        >
          Simpan Perubahan
        </Button>
      </div>

      <div className="flex flex-col gap-sm">
        {packages.map((pkg, index) => (
          <Card key={pkg.id} className="flex flex-col gap-sm">
            <div className="flex items-center justify-between">
              <span className="font-display text-title-md text-on-surface">{pkg.id}</span>
              <div className="flex items-center gap-xs">
                <button
                  type="button"
                  onClick={() => reorder(index, -1)}
                  disabled={index === 0}
                  aria-label="Naikkan urutan"
                  className="font-body text-body-sm text-on-surface-variant disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => reorder(index, 1)}
                  disabled={index === packages.length - 1}
                  aria-label="Turunkan urutan"
                  className="font-body text-body-sm text-on-surface-variant disabled:opacity-30"
                >
                  ↓
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-sm md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="font-body text-body-sm text-on-surface-variant">Label</span>
                <input
                  className={INPUT_CLASSES}
                  value={pkg.label}
                  onChange={(e) => updatePackage(pkg.id, { label: e.target.value })}
                />
              </label>

              <div className="flex flex-col gap-1">
                <span className="font-body text-body-sm text-on-surface-variant">
                  Harga ({pkg.price_status === "confirmed" ? "terkonfirmasi" : "draft"})
                </span>
                <div className="flex items-center gap-sm">
                  <input
                    type="number"
                    className={INPUT_CLASSES}
                    value={pkg.price}
                    disabled={!canEditPrice}
                    onChange={(e) => updatePackage(pkg.id, { price: Number(e.target.value) })}
                  />
                  {pkg.price_status === "draft" && canEditPrice ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void handleConfirmPrice(pkg.id)}
                      loading={confirmingId === pkg.id}
                    >
                      Konfirmasi
                    </Button>
                  ) : null}
                </div>
                <span className="font-body text-body-sm text-on-surface-variant">
                  {formatCurrencyIDR(pkg.price)}
                </span>
              </div>

              <label className="flex flex-col gap-1">
                <span className="font-body text-body-sm text-on-surface-variant">
                  Kuota Internet (GB)
                </span>
                <input
                  type="number"
                  className={INPUT_CLASSES}
                  value={pkg.quota_internet_gb}
                  onChange={(e) =>
                    updatePackage(pkg.id, { quota_internet_gb: Number(e.target.value) })
                  }
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-body text-body-sm text-on-surface-variant">
                  Kuota Roaming (GB)
                </span>
                <input
                  type="number"
                  className={INPUT_CLASSES}
                  value={pkg.quota_roaming_gb}
                  onChange={(e) =>
                    updatePackage(pkg.id, { quota_roaming_gb: Number(e.target.value) })
                  }
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-body text-body-sm text-on-surface-variant">
                  Menit Telepon
                </span>
                <input
                  type="number"
                  className={INPUT_CLASSES}
                  value={pkg.voice_minutes}
                  onChange={(e) => updatePackage(pkg.id, { voice_minutes: Number(e.target.value) })}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-body text-body-sm text-on-surface-variant">SMS</span>
                <input
                  type="number"
                  className={INPUT_CLASSES}
                  value={pkg.sms_count}
                  onChange={(e) => updatePackage(pkg.id, { sms_count: Number(e.target.value) })}
                />
              </label>
            </div>

            <div className="flex gap-lg">
              <label className="flex items-center gap-xs font-body text-body-sm text-on-surface">
                <input
                  type="checkbox"
                  checked={pkg.recommended}
                  onChange={(e) => updatePackage(pkg.id, { recommended: e.target.checked })}
                />
                Direkomendasikan
              </label>
              <label className="flex items-center gap-xs font-body text-body-sm text-on-surface">
                <input
                  type="checkbox"
                  checked={pkg.active}
                  onChange={(e) => updatePackage(pkg.id, { active: e.target.checked })}
                />
                Aktif
              </label>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
