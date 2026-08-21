"use client";

import { useId, type ReactNode } from "react";

/**
 * Shared chrome for every form field: label above (never a placeholder
 * standing in for one), error message wired via `aria-describedby` +
 * `aria-invalid`, and an optional helper-text slot. The actual `<input>`/
 * `<select>` is supplied via `renderInput` so each field component keeps
 * full control of its own element type and props while sharing this
 * wiring (DESIGN.md §8, B035).
 */
export interface FieldWrapperProps {
  label: string;
  error?: string | undefined;
  helperText?: string | undefined;
  required?: boolean | undefined;
  renderInput: (args: {
    id: string;
    describedBy: string | undefined;
    invalid: boolean;
  }) => ReactNode;
}

export function FieldWrapper({
  label,
  error,
  helperText,
  required,
  renderInput,
}: FieldWrapperProps) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  const helperId = helperText ? `${id}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1 pt-2">
      <label htmlFor={id} className="font-body text-body-sm text-on-surface-variant">
        {label}
        {required ? (
          <span aria-hidden="true" className="text-primary-container">
            {" "}
            *
          </span>
        ) : null}
      </label>
      {renderInput({ id, describedBy, invalid: Boolean(error) })}
      {error ? (
        <p id={errorId} role="alert" className="font-body text-body-sm text-error">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="font-body text-body-sm text-on-surface-variant">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
