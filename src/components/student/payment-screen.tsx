"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StudentShell } from "./student-shell";
import { StepIndicator } from "./step-indicator";
import { ReservationTimer } from "./reservation-timer";
import { QrisPanel } from "./qris-panel";
import { OrderSummary } from "./order-summary";
import type { OrderFormValues } from "./order-form";
import { FileUploader, type FileUploaderState } from "@/components/ui/file-uploader";
import { Button } from "@/components/ui/button";
import { useReservation } from "@/hooks/use-reservation";
import { useFormDraft } from "@/hooks/use-form-draft";
import { clearFlowState, readFlowState } from "@/lib/flow-state";
import type { PackageEntry } from "@/server/db/types";

const EMPTY_VALUES: OrderFormValues = { full_name: "", university: "", whatsapp: "", email: "" };
const APPROX_TTL_MS = 15 * 60_000;

/** Errors inherent to the file itself — resubmitting the *same* file via
 * `submit()` will fail identically forever, since nothing about the file
 * changes between attempts. Everything else (network blips, 5xx) is
 * genuinely worth retrying with the same file. */
const FILE_PROBLEM_CODES = new Set(["INVALID_FILE_TYPE", "FILE_TOO_LARGE"]);

export interface PaymentScreenProps {
  numberDisplay: string;
  /** All active packages — the client resolves which one was picked on
   * `/paket` (`flow-state`'s sessionStorage), since the Server Component
   * page has no access to that client-only convenience state. */
  packages: PackageEntry[];
  orderRef: string;
  reservedUntil: string;
  qrImageUrl: string | null;
  paymentLabel: string;
}

/**
 * The payment screen (B081-B084) — QRIS display, order summary, and the
 * proof upload wired to `submitOrder` via `XMLHttpRequest` (not `fetch`,
 * which exposes no upload-progress event). Client-side type/size checks
 * in `FileUploader` are UX only, explicitly not the control — the server
 * re-validates via magic bytes and re-encoding regardless (AGENTS.md).
 */
export function PaymentScreen({
  numberDisplay,
  packages,
  orderRef,
  reservedUntil: initialReservedUntil,
  qrImageUrl,
  paymentLabel,
}: PaymentScreenProps) {
  const router = useRouter();
  const { reservedUntil, now, revalidate } = useReservation();
  const effectiveReservedUntil = reservedUntil ?? new Date(initialReservedUntil);
  const { draft, clearDraft } = useFormDraft<OrderFormValues>(orderRef, EMPTY_VALUES);
  const [pkg] = useState<PackageEntry | null>(
    () => packages.find((p) => p.id === readFlowState().selectedPackageId) ?? null,
  );

  useEffect(() => {
    // No package selection survived (a fresh tab, a cleared session) —
    // there's nothing to pay for; send the student back to pick one
    // rather than rendering a broken payment screen.
    if (!pkg) router.replace("/paket");
  }, [pkg, router]);

  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<FileUploaderState>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  // Stable across retries of the *same* attempt — a retry after a network
  // failure must reuse this so a submission that actually succeeded
  // server-side is never duplicated (B084).
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  function handleFileSelected(selected: File) {
    setFile(selected);
    setUploadState("selected");
    setErrorMessage(undefined);
    setErrorCode(undefined);
  }

  function handleRemove() {
    setFile(null);
    setUploadState("idle");
    setErrorMessage(undefined);
    setErrorCode(undefined);
  }

  function handleCancel() {
    xhrRef.current?.abort();
  }

  function submit() {
    if (!file || !pkg) return;
    setUploadState("uploading");
    setProgress(0);
    setErrorMessage(undefined);
    setErrorCode(undefined);

    const formData = new FormData();
    formData.append("full_name", draft.full_name);
    formData.append("university", draft.university);
    formData.append("whatsapp", draft.whatsapp);
    formData.append("email", draft.email);
    formData.append("package_id", pkg.id);
    formData.append("idempotency_key", idempotencyKeyRef.current);
    formData.append("proof", file);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("POST", "/api/orders");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setUploadState("success");
        clearDraft();
        clearFlowState();
        try {
          const body = JSON.parse(xhr.responseText) as {
            order_ref: string;
            number: string;
            package_label: string;
            full_name: string;
            email: string;
            submitted_at: string;
          };
          // Transient, cleared after one read on /konfirmasi — order
          // summary display data, not reservation state or the tracking
          // token (which was already shown once, at reservation time).
          window.sessionStorage.setItem("halo_confirmation", JSON.stringify(body));
          router.push(`/konfirmasi?ref=${encodeURIComponent(body.order_ref)}`);
        } catch {
          router.push("/konfirmasi");
        }
        return;
      }
      let message = "Gagal mengirim pesanan. Silakan coba lagi.";
      let code: string | undefined;
      try {
        const body = JSON.parse(xhr.responseText) as {
          error?: { message?: string; code?: string };
        };
        message = body.error?.message ?? message;
        code = body.error?.code;
      } catch {
        // Keep the generic message.
      }
      setErrorMessage(message);
      setErrorCode(code);
      setUploadState("error");
    };
    xhr.onerror = () => {
      setErrorMessage("Koneksi terputus saat mengunggah. Silakan coba lagi.");
      setErrorCode(undefined);
      setUploadState("error");
    };
    xhr.onabort = () => {
      setUploadState("selected");
    };
    xhr.send(formData);
  }

  function handleRetry() {
    // A file-problem error (wrong type, too large) will fail identically
    // every time on the exact same file — found live: retrying just
    // looped on the same error forever. Only genuinely transient failures
    // (network blips, server errors) are worth resubmitting as-is.
    if (errorCode && FILE_PROBLEM_CODES.has(errorCode)) {
      handleRemove();
      return;
    }
    submit();
  }

  async function handleExpire() {
    const result = await revalidate();
    if (!result) router.push("/?reason=expired");
  }

  const canSubmit = file !== null && uploadState !== "uploading" && pkg !== null;

  return (
    <StudentShell
      timerSlot={
        <ReservationTimer
          reservedAt={new Date(effectiveReservedUntil.getTime() - APPROX_TTL_MS)}
          reservedUntil={effectiveReservedUntil}
          onExpire={() => void handleExpire()}
          now={now}
        />
      }
      bottomBar={
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!canSubmit}
          loading={uploadState === "uploading"}
          onClick={submit}
        >
          Kirim Bukti Pembayaran
        </Button>
      }
    >
      <div className="flex flex-col gap-lg">
        <StepIndicator currentStep={4} />
        <h1 className="font-display text-headline-lg-mobile text-on-surface md:text-headline-lg">
          Selesaikan Pembayaran
        </h1>

        <QrisPanel qrImageUrl={qrImageUrl} paymentLabel={paymentLabel} />

        {pkg ? (
          <OrderSummary
            numberDisplay={numberDisplay}
            packageLabel={pkg.label}
            packagePrice={pkg.price}
            orderRef={orderRef}
          />
        ) : null}

        <FileUploader
          state={uploadState}
          file={file}
          progressPercent={progress}
          {...(errorMessage !== undefined ? { errorMessage } : {})}
          onFileSelected={handleFileSelected}
          onRemove={handleRemove}
          onRetry={handleRetry}
          onCancel={handleCancel}
        />
      </div>
    </StudentShell>
  );
}
