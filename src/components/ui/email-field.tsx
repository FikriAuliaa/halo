"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { FieldWrapper } from "./field-wrapper";
import { INPUT_CLASSES, INPUT_ERROR_CLASSES } from "./text-field";

export interface EmailFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
  helperText?: string;
}

export const EmailField = forwardRef<HTMLInputElement, EmailFieldProps>(function EmailField(
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
          type="email"
          autoComplete="email"
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
