"use client";

import { useEffect, useState } from "react";
import { ErrorState } from "@/components/ui/error-state";
import { useToast } from "@/hooks/use-toast";

interface UniversityEntry {
  name: string;
  active: boolean;
}

export default function UniversitiesConfigPage() {
  const { showToast } = useToast();
  const [list, setList] = useState<UniversityEntry[]>([]);
  const [newName, setNewName] = useState("");
  const [state, setState] = useState<"loading" | "idle" | "error">("loading");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  async function load() {
    setState("loading");
    try {
      const res = await fetch("/api/admin/config/universities");
      if (!res.ok) throw new Error("failed");
      const body = await res.json();
      setList(body.list ?? []);
      setState("idle");
      setDirty(false);
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function updateEntry(index: number, patch: Partial<UniversityEntry>) {
    setList((prev) => prev.map((u, i) => (i === index ? { ...u, ...patch } : u)));
    setDirty(true);
  }

  function removeEntry(index: number) {
    setList((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  }

  function addEntry() {
    const name = newName.trim();
    if (!name || list.some((u) => u.name === name)) return;
    setList((prev) => [...prev, { name, active: true }]);
    setNewName("");
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/config/universities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast("error", body?.error?.message ?? "Gagal menyimpan perubahan.");
        return;
      }
      showToast("success", "Daftar universitas disimpan.");
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  if (state === "error") return <ErrorState variant="server" onRetry={() => void load()} />;
  if (state === "loading") {
    return (
      <div
        role="status"
        aria-busy="true"
        className="p-xl text-center font-body text-body-sm text-on-surface-variant"
      >
        Memuat daftar universitas...
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-lg">
      {/* Header */}
      <header className="mb-sm flex flex-col justify-between gap-md sm:flex-row sm:items-center">
        <h2 className="font-display-lg text-display-lg text-on-surface">Konfigurasi Universitas</h2>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!dirty || saving}
          className="font-title-md cursor-pointer rounded-full border border-outline-variant bg-surface-container-high px-lg py-sm text-title-md text-on-surface transition-colors hover:border-primary hover:bg-surface-bright disabled:opacity-40"
        >
          {saving ? "Memproses..." : "Simpan Perubahan"}
        </button>
      </header>

      {/* Configuration Card */}
      <div className="relative overflow-hidden rounded-xl border border-outline-variant bg-surface-container shadow-2xl">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#4A0000]/20 to-transparent" />
        <div className="relative z-10 flex flex-col gap-0 p-md sm:p-lg">
          {list.map((u, index) => (
            <div
              key={u.name}
              className="hover:bg-surface-variant/50 group -mx-sm flex items-center justify-between rounded-lg border-b border-[#2A2A2A] px-sm py-md transition-colors last:border-b-0"
            >
              <span className="font-title-md text-title-md text-on-surface">{u.name}</span>
              <div className="flex items-center gap-md">
                <label className="flex cursor-pointer select-none items-center gap-sm transition-colors group-hover:text-primary">
                  <input
                    type="checkbox"
                    checked={u.active}
                    onChange={(e) => updateEntry(index, { active: e.target.checked })}
                    className="form-checkbox h-5 w-5 rounded border-outline-variant bg-surface-container-lowest text-primary-container focus:ring-primary focus:ring-offset-background"
                  />
                  <span className="font-label-bold text-label-bold uppercase">Aktif</span>
                </label>
                <button
                  type="button"
                  onClick={() => removeEntry(index)}
                  className="font-body-sm cursor-pointer text-body-sm text-on-surface-variant transition-colors hover:text-error"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
          {list.length === 0 ? (
            <p className="font-body-sm py-md text-center text-body-sm text-on-surface-variant">
              Belum ada universitas. Tambahkan nama universitas di bawah.
            </p>
          ) : null}
        </div>
      </div>

      {/* Add New Field */}
      <div className="mt-md flex w-full flex-col items-start gap-sm sm:flex-row sm:items-center">
        <div className="relative w-full flex-1">
          <input
            type="text"
            placeholder="Nama universitas baru"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addEntry();
            }}
            className="font-body-lg w-full rounded-t-md border-b-2 border-[#2A2A2A] bg-surface-container-low p-sm text-on-surface outline-none transition-colors placeholder:text-on-surface-variant focus:border-primary-container focus:ring-0"
          />
        </div>
        <button
          type="button"
          onClick={addEntry}
          disabled={!newName.trim()}
          className="font-title-md w-full cursor-pointer rounded-full border border-outline-variant bg-transparent px-lg py-sm text-title-md text-on-surface transition-colors hover:border-primary-container hover:bg-primary-container/10 disabled:opacity-40 sm:w-auto"
        >
          Tambah
        </button>
      </div>
    </div>
  );
}
