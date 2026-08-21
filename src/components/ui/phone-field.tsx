"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { FieldWrapper } from "./field-wrapper";
import { INPUT_CLASSES, INPUT_ERROR_CLASSES } from "./text-field";
import { normalizePhone } from "@/lib/format";

export interface PhoneFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "onBlur" | "value" | "defaultValue"
> {
  label: string;
  error?: string;
  helperText?: string;
  value: string;
  onValueChange: (value: string) => void;
  /** Fires after the field's own normalisation-on-blur logic runs — e.g.
   * to trigger field-level validation (B078's "errors announced on blur,
   * not on every keystroke"). */
  onBlur?: () => void;
}

/**
 * Fixed "+62" prefix affordance per the design reference, but accepts
 * `08...`, `+628...`, and `628...` pasted or typed values (C5) — on blur,
 * the field normalises to the `08...` display form. Normalisation is a UX
 * convenience only; actual enforcement happens server-side via the shared
 * Zod schema (AGENTS.md — no business logic lives in a component).
 */
export const PhoneField = forwardRef<HTMLInputElement, PhoneFieldProps>(function PhoneField(
  { label, error, helperText, required, className, value, onValueChange, onBlur, ...rest },
  ref,
) {
  function handleBlur() {
    try {
      // The field's own value never includes the "+62" — that's a fixed,
      // non-removable affordance rendered next to the input, not part of
      // its content. So the value re-displayed after normalisation must be
      // stripped back down to just what belongs after that prefix, not
      // `normalizePhone`'s own "08..." convention (used elsewhere, where
      // there's no separate prefix already on screen) — otherwise a typed
      // "081234..." or normalized "0..." would show up doubled as
      // "+62081234...".
      const normalized = normalizePhone(value);
      onValueChange(normalized.replace(/^\+62/, ""));
    } catch {
      // Leave the value as typed — real validation surfaces the error via
      // the `error` prop, driven by the shared schema at submission.
    }
    onBlur?.();
  }

  return (
    <FieldWrapper
      label={label}
      error={error}
      helperText={helperText}
      required={required}
      renderInput={({ id, describedBy, invalid }) => (
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-sm top-1/2 -translate-y-1/2 font-body text-body-lg text-on-surface-variant"
          >
            +62
          </span>
          <input
            ref={ref}
            id={id}
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            required={required}
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            onBlur={handleBlur}
            className={[INPUT_CLASSES, "pl-12", invalid && INPUT_ERROR_CLASSES, className]
              .filter(Boolean)
              .join(" ")}
            {...rest}
          />
        </div>
      )}
    />
  );
});
