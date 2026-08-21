"use client";

import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { ProgressBar } from "./progress-bar";

export type FileUploaderState =
  "idle" | "drag-over" | "selected" | "uploading" | "error" | "success";

export interface FileUploaderProps {
  label?: string;
  hint?: string;
  state: FileUploaderState;
  file?: File | null;
  progressPercent?: number;
  errorMessage?: string;
  onFileSelected: (file: File) => void;
  onRemove?: () => void;
  onRetry?: () => void;
  onCancel?: () => void;
  /**
   * Fast, UX-only feedback for an obviously-wrong file — NOT a security
   * control (AGENTS.md/B041). The server always re-validates via magic
   * bytes regardless of what this reports.
   */
  acceptHint?: string;
}

const CONVENIENCE_ACCEPT = "image/jpeg,image/png,image/webp";
const CONVENIENCE_MAX_BYTES = 5 * 1024 * 1024;

export function FileUploader({
  label = "Unggah Bukti Pembayaran",
  hint = "Format JPG, PNG, WEBP (Maks 5MB)",
  state,
  file,
  progressPercent = 0,
  errorMessage,
  onFileSelected,
  onRemove,
  onRetry,
  onCancel,
}: FileUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    // Revoke on unmount / file change to avoid leaking the blob URL (B041).
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleFiles(fileList: FileList | null) {
    const selected = fileList?.[0];
    if (selected) onFileSelected(selected);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  const effectiveState = isDragOver ? "drag-over" : state;

  return (
    <div className="flex flex-col gap-sm">
      <span className="font-body text-label-bold uppercase tracking-wide text-on-surface-variant">
        Unggah Bukti
      </span>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={[
          "flex flex-col items-center justify-center gap-sm rounded-card border-2 border-dashed p-lg",
          effectiveState === "error" ? "border-error" : "border-divider",
          effectiveState === "drag-over" ? "border-secondary-container" : "",
        ].join(" ")}
      >
        {effectiveState === "idle" || effectiveState === "drag-over" ? (
          <>
            <span aria-hidden="true" className="material-symbols-outlined text-on-surface-variant">
              cloud_upload
            </span>
            <label
              htmlFor={inputId}
              className="cursor-pointer font-display text-title-md text-on-surface"
            >
              {label}
            </label>
            <span className="font-body text-body-sm text-on-surface-variant">{hint}</span>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept={CONVENIENCE_ACCEPT}
              className="sr-only"
              onChange={(e) => {
                const selected = e.target.files?.[0];
                if (selected && selected.size > CONVENIENCE_MAX_BYTES) {
                  // Convenience-only check; server re-validates authoritatively.
                  return;
                }
                handleFiles(e.target.files);
              }}
            />
          </>
        ) : null}

        {effectiveState === "selected" && file ? (
          <div className="flex w-full items-center gap-sm">
            {previewUrl ? (
              // Local blob preview, not an optimizable remote/static asset.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="" className="h-16 w-16 rounded object-cover" />
            ) : null}
            <span className="flex-1 truncate font-body text-body-sm text-on-surface">
              {file.name}
            </span>
            <button type="button" onClick={onRemove} className="font-body text-body-sm text-error">
              Hapus
            </button>
          </div>
        ) : null}

        {effectiveState === "uploading" ? (
          <div className="flex w-full flex-col gap-sm">
            <ProgressBar percent={progressPercent} aria-label="Progres unggah" />
            <button
              type="button"
              onClick={onCancel}
              className="self-end font-body text-body-sm text-on-surface-variant"
            >
              Batalkan
            </button>
          </div>
        ) : null}

        {effectiveState === "error" ? (
          <div className="flex flex-col items-center gap-sm">
            <p role="alert" className="font-body text-body-sm text-error">
              {errorMessage ?? "Unggah gagal."}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="font-body text-body-sm text-secondary"
            >
              Coba Lagi
            </button>
          </div>
        ) : null}

        {effectiveState === "success" && file ? (
          <div className="flex w-full items-center gap-sm">
            <span aria-hidden="true" className="material-symbols-outlined text-secondary-container">
              check_circle
            </span>
            <span className="flex-1 truncate font-body text-body-sm text-on-surface">
              {file.name}
            </span>
            <button
              type="button"
              onClick={onRemove}
              className="font-body text-body-sm text-on-surface-variant"
            >
              Ganti
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
