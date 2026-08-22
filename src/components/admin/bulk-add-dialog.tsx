"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { INPUT_CLASSES } from "@/components/ui/text-field";
import { useToast } from "@/hooks/use-toast";
import type { AdminPreviewNumberOutcome } from "@/server/operations/admin/numbers/preview-add-numbers";
import type { AdminAddNumberOutcome } from "@/server/operations/admin/numbers/add-numbers";

export interface BulkAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}

const MAX_ENTRIES = 200;

function splitEntries(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .flatMap((line) => line.split(/\s+/))
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function previewLabel(outcome: AdminPreviewNumberOutcome): { text: string; tone: string } {
  switch (outcome.outcome) {
    case "valid":
      return { text: "Valid, akan ditambahkan", tone: "text-primary" };
    case "duplicate_existing":
      return { text: "Sudah terdaftar", tone: "text-on-surface-variant" };
    case "duplicate_in_batch":
      return { text: "Duplikat dalam daftar ini", tone: "text-on-surface-variant" };
    case "invalid":
      return { text: outcome.reason, tone: "text-error" };
  }
}

function commitLabel(outcome: AdminAddNumberOutcome): { text: string; tone: string } {
  switch (outcome.outcome) {
    case "created":
      return { text: "Berhasil ditambahkan", tone: "text-primary" };
    case "already_present":
      return { text: "Sudah terdaftar", tone: "text-on-surface-variant" };
    case "duplicate_in_batch":
      return { text: "Duplikat dalam daftar ini", tone: "text-on-surface-variant" };
    case "invalid":
      return { text: outcome.reason, tone: "text-error" };
  }
}

/**
 * Bulk-add with a mandatory preview step (B107) — an admin pasting 200
 * numbers sees exactly what will happen (valid / already in inventory /
 * duplicated within the paste / invalid and why) before anything is
 * written. Preview and commit call two different, read-only-vs-writing
 * endpoints that share the same classification logic, so what's
 * previewed is what committing actually does.
 */
export function BulkAddDialog({ open, onOpenChange, onAdded }: BulkAddDialogProps) {
  const { showToast } = useToast();
  const [raw, setRaw] = useState("");
  const [stage, setStage] = useState<"input" | "preview" | "result">("input");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<AdminPreviewNumberOutcome[]>([]);
  const [result, setResult] = useState<AdminAddNumberOutcome[]>([]);

  const entries = splitEntries(raw);
  const overLimit = entries.length > MAX_ENTRIES;

  function reset() {
    setRaw("");
    setStage("input");
    setPreview([]);
    setResult([]);
  }

  async function handlePreview() {
    if (entries.length === 0 || overLimit) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/numbers/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numbers: entries }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast("error", body?.error?.message ?? "Gagal memuat pratinjau.");
        return;
      }
      setPreview(body.results ?? []);
      setStage("preview");
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numbers: entries }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast("error", body?.error?.message ?? "Gagal menambahkan nomor.");
        return;
      }
      setResult(body.results ?? []);
      setStage("result");
      onAdded();
    } finally {
      setLoading(false);
    }
  }

  const validCount = preview.filter((r) => r.outcome === "valid").length;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!loading) {
          onOpenChange(next);
          if (!next) reset();
        }
      }}
      title="Tambah Nomor Massal"
      description="Tempel banyak nomor sekaligus, dipisahkan baris baru, koma, atau spasi."
      preventClose={loading}
    >
      <div className="flex max-h-[60vh] flex-col gap-md overflow-y-auto">
        {stage === "input" ? (
          <>
            <textarea
              className={`${INPUT_CLASSES} min-h-40 resize-y`}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={"0811111111\n0822222222, 0833333333"}
              disabled={loading}
            />
            <p className="font-body text-body-sm text-on-surface-variant">
              {entries.length} nomor terdeteksi
              {overLimit ? ` — maksimal ${MAX_ENTRIES} nomor per permintaan` : ""}.
            </p>
          </>
        ) : null}

        {stage === "preview" ? (
          <>
            <p className="font-body text-body-sm text-on-surface-variant">
              {validCount} dari {preview.length} nomor valid dan akan ditambahkan.
            </p>
            <div className="flex flex-col gap-1">
              {preview.map((outcome, i) => {
                const label = previewLabel(outcome);
                return (
                  <div
                    key={`${outcome.input}-${i}`}
                    className="flex items-center justify-between gap-sm border-t border-outline-variant py-1 first:border-t-0"
                  >
                    <span className="font-body text-body-sm text-on-surface">{outcome.input}</span>
                    <span className={`font-body text-body-sm ${label.tone}`}>{label.text}</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}

        {stage === "result" ? (
          <div className="flex flex-col gap-1">
            {result.map((outcome, i) => {
              const label = commitLabel(outcome);
              return (
                <div
                  key={`${outcome.input}-${i}`}
                  className="flex items-center justify-between gap-sm border-t border-outline-variant py-1 first:border-t-0"
                >
                  <span className="font-body text-body-sm text-on-surface">{outcome.input}</span>
                  <span className={`font-body text-body-sm ${label.tone}`}>{label.text}</span>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="flex justify-end gap-sm">
          {stage === "input" ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
                Batal
              </Button>
              <Button
                variant="primary"
                onClick={() => void handlePreview()}
                loading={loading}
                disabled={entries.length === 0 || overLimit}
              >
                Pratinjau
              </Button>
            </>
          ) : null}
          {stage === "preview" ? (
            <>
              <Button variant="ghost" onClick={() => setStage("input")} disabled={loading}>
                Kembali
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleCommit()}
                loading={loading}
                disabled={validCount === 0}
              >
                Tambahkan {validCount} Nomor
              </Button>
            </>
          ) : null}
          {stage === "result" ? (
            <Button
              variant="primary"
              onClick={() => {
                onOpenChange(false);
                reset();
              }}
            >
              Selesai
            </Button>
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}
