"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { FieldWrapper } from "./field-wrapper";

// DESIGN.md §8 "Inputs": dark fill, transparent 2px bottom border at rest,
// brand-red on focus, plus a visible keyboard focus ring (§7 — the
// reference's color-only border change is insufficient for WCAG 2.4.7).
export const INPUT_CLASSES =
  "w-full rounded-field bg-surface-container-lowest px-sm py-sm font-body text-body-lg text-on-surface placeholder:text-on-surface-variant border-b-2 border-transparent focus:border-primary-container focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-container disabled:opacity-50 disabled:cursor-not-allowed";
export const INPUT_ERROR_CLASSES = "border-b-error focus:border-error";

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, helperText, required, className, ...rest },
  ref,
) {
  return (
    <FieldWrapper
      label={label}
      error={error}
      helperText={helperText}
      required={required}
      renderInput={({ id, describedBy, invalid }) => (
        <input
          ref={ref}
          id={id}
          type="text"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          required={required}
          className={[INPUT_CLASSES, invalid && INPUT_ERROR_CLASSES, className]
            .filter(Boolean)
            .join(" ")}
          {...rest}
        />
      )}
    />
  );
});
