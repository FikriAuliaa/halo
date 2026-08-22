export type StepStatus = "completed" | "current" | "upcoming";

const STEPS = ["Nomor", "Paket", "Data", "Bayar"] as const;

export interface StepIndicatorProps {
  /** 1-indexed current step, 1-4. */
  currentStep: 1 | 2 | 3 | 4;
}

function statusFor(stepIndex: number, currentStep: number): StepStatus {
  if (stepIndex < currentStep) return "completed";
  if (stepIndex === currentStep) return "current";
  return "upcoming";
}

const CIRCLE_CLASSES: Record<StepStatus, string> = {
  completed: "bg-primary-container text-on-primary-container",
  current: "border-2 border-secondary-container text-on-surface",
  upcoming: "border border-outline-variant text-on-surface-variant",
};

/**
 * Not interactive — backward navigation is governed by reservation state
 * (whether the number/session is still valid), not by clicking a completed
 * step (DESIGN.md, B045). A plain `<ol>`, not a nav of links.
 */
export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <ol className="flex items-center gap-xs">
      {STEPS.map((label, i) => {
        const stepNumber = i + 1;
        const status = statusFor(stepNumber, currentStep);
        return (
          <li
            key={label}
            aria-current={status === "current" ? "step" : undefined}
            className="flex flex-1 items-center gap-xs"
          >
            <span
              aria-label={`Langkah ${stepNumber} dari ${STEPS.length}: ${label}`}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-body text-label-bold ${CIRCLE_CLASSES[status]}`}
            >
              {status === "completed" ? "✓" : stepNumber}
            </span>
            <span className="font-body text-body-sm text-on-surface-variant">{label}</span>
            {stepNumber < STEPS.length ? (
              <span aria-hidden="true" className="h-px flex-1 bg-outline-variant" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
