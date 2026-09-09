"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StudentShell } from "./student-shell";
import { StepIndicator } from "./step-indicator";
import { ReservationTimer } from "./reservation-timer";
import { OrderForm, type OrderFormErrors, type OrderFormValues } from "./order-form";
import { Button } from "@/components/ui/button";
import { useReservation } from "@/hooks/use-reservation";
import { useFormDraft } from "@/hooks/use-form-draft";
import { personalDataFormSchema } from "@/schemas/order";

import { OrderRefDialog } from "./order-ref-dialog";

const APPROX_TTL_MS = 15 * 60_000;
const EMPTY_VALUES: OrderFormValues = { full_name: "", university: "", whatsapp: "", email: "" };

export interface DataFormScreenProps {
  universities: string[];
  reservedUntil: string;
  orderRef: string;
}

export function DataFormScreen({
  universities,
  reservedUntil: initial,
  orderRef,
}: DataFormScreenProps) {
  const router = useRouter();
  const { reservedUntil, now, revalidate } = useReservation();
  const effectiveReservedUntil = reservedUntil ?? new Date(initial);

  const { draft, setDraft, clearDraft } = useFormDraft<OrderFormValues>(orderRef, EMPTY_VALUES);
  const [errors, setErrors] = useState<OrderFormErrors>({});
  const [activeOrderRef, setActiveOrderRef] = useState(orderRef);
  const [showOrderRefDialog, setShowOrderRefDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function validateField(field: keyof OrderFormValues) {
    const result = personalDataFormSchema.safeParse(draft);
    if (result.success) {
      setErrors((e) => ({ ...e, [field]: undefined }));
      return;
    }
    const issue = result.error.issues.find((i) => i.path[0] === field);
    setErrors((e) => ({ ...e, [field]: issue?.message }));
  }

  async function handleExpire() {
    const result = await revalidate();
    if (!result) {
      clearDraft();
      router.push("/?reason=expired");
    }
  }

  async function handleContinue() {
    const result = personalDataFormSchema.safeParse(draft);
    if (!result.success) {
      const nextErrors: OrderFormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof OrderFormValues;
        nextErrors[field] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reservations/current", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: draft.whatsapp }),
      });
      if (res.ok) {
        const data = (await res.json()) as { order_ref: string };
        setActiveOrderRef(data.order_ref);
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(`halo_form_draft_${data.order_ref}`, JSON.stringify(draft));
          window.sessionStorage.setItem("halo_current_form_draft", JSON.stringify(draft));
        }
      }
    } catch {
      // Continue with current order reference if network blips
    } finally {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("halo_current_form_draft", JSON.stringify(draft));
      }
      setSubmitting(false);
      setShowOrderRefDialog(true);
    }
  }

  function handleDialogContinue() {
    setShowOrderRefDialog(false);
    router.push("/paket");
  }

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
          loading={submitting}
          onClick={() => void handleContinue()}
        >
          Lanjut Pilih Paket
        </Button>
      }
    >
      <div className="flex flex-col gap-lg">
        <StepIndicator currentStep={2} />
        <div className="flex flex-col gap-xs">
          <h1 className="font-display text-headline-lg-mobile text-on-surface md:text-headline-lg">
            Lengkapi Data Diri
          </h1>
          <p className="font-body text-body-sm text-on-surface-variant">
            Data ini digunakan untuk konfirmasi pesanan dan informasi paket Halo kamu.
          </p>
        </div>
        <OrderForm
          universities={universities}
          values={draft}
          errors={errors}
          onChange={setDraft}
          onBlurField={validateField}
        />
      </div>

      {showOrderRefDialog ? (
        <OrderRefDialog open orderRef={activeOrderRef} onContinue={handleDialogContinue} />
      ) : null}
    </StudentShell>
  );
}
