"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { INPUT_CLASSES } from "@/components/ui/text-field";
import { useToast } from "@/hooks/use-toast";

interface UniversityEntry {
  name: string;
  active: boolean;
}

/**
 * `/admin/konfigurasi/kampus` (B111) — full-document replace, same
 * model as the packages screen. No delete button: removing an entry
 * from the list here *is* the delete, and the server refuses it (leaving
 * the list unchanged) if any order references that name — the error
 * names which one, so "deactivate instead" is a next, obvious step
 * rather than a dead end.
 */
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
        className="font-body text-body-sm text-on-surface-variant"
      >
        Memuat…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-headline-lg text-on-surface">Konfigurasi Universitas</h1>
        <Button
          variant="primary"
          onClick={() => void handleSave()}
          loading={saving}
          disabled={!dirty}
        >
          Simpan Perubahan
        </Button>
      </div>

      <Card className="flex flex-col gap-sm">
        {list.map((u, index) => (
          <div
            key={u.name}
            className="flex items-center gap-sm border-t border-outline-variant py-sm first:border-t-0"
          >
            <span className="flex-1 font-body text-body-lg text-on-surface">{u.name}</span>
            <label className="flex items-center gap-xs font-body text-body-sm text-on-surface">
              <input
                type="checkbox"
                checked={u.active}
                onChange={(e) => updateEntry(index, { active: e.target.checked })}
              />
              Aktif
            </label>
            <button
              type="button"
              onClick={() => removeEntry(index)}
              className="font-body text-body-sm text-error underline-offset-2 hover:underline"
            >
              Hapus
            </button>
          </div>
        ))}
        {list.length === 0 ? (
          <p className="font-body text-body-sm text-on-surface-variant">Belum ada universitas.</p>
        ) : null}
      </Card>

      <div className="flex gap-sm">
        <input
          className={INPUT_CLASSES}
          placeholder="Nama universitas baru"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button variant="secondary" onClick={addEntry} disabled={!newName.trim()}>
          Tambah
        </Button>
      </div>
    </div>
  );
}
