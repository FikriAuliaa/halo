"use client";

import * as RadixSelect from "@radix-ui/react-select";
import { useId } from "react";
import { FieldWrapper } from "./field-wrapper";
import { INPUT_CLASSES, INPUT_ERROR_CLASSES } from "./text-field";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectFieldProps {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  placeholder?: string;
  value: string | undefined;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
}

// Radix Select is keyboard-navigable and supports type-ahead out of the
// box — this wraps it in the same visual chrome as the text inputs
// (DESIGN.md §8) rather than reimplementing that behavior from scratch.
export function SelectField({
  label,
  error,
  helperText,
  required,
  placeholder,
  value,
  onValueChange,
  options,
  disabled = false,
}: SelectFieldProps) {
  const contentId = useId();

  return (
    <FieldWrapper
      label={label}
      error={error}
      helperText={helperText}
      required={required}
      renderInput={({ id, describedBy, invalid }) => (
        <RadixSelect.Root
          {...(value !== undefined ? { value } : {})}
          onValueChange={onValueChange}
          disabled={disabled}
        >
          <RadixSelect.Trigger
            id={id}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={[
              INPUT_CLASSES,
              "flex items-center justify-between",
              invalid && INPUT_ERROR_CLASSES,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <RadixSelect.Value placeholder={placeholder} />
            <RadixSelect.Icon aria-hidden="true">
              <span className="material-symbols-outlined text-on-surface-variant">expand_more</span>
            </RadixSelect.Icon>
          </RadixSelect.Trigger>
          <RadixSelect.Portal>
            <RadixSelect.Content
              id={contentId}
              position="popper"
              className="z-50 overflow-hidden rounded-field border border-outline-variant bg-surface-container shadow-lg"
            >
              <RadixSelect.Viewport className="p-1">
                {options.map((option) => (
                  <RadixSelect.Item
                    key={option.value}
                    value={option.value}
                    className="cursor-pointer rounded px-sm py-2 font-body text-body-lg text-on-surface outline-none data-[highlighted]:bg-surface-container-high"
                  >
                    <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                  </RadixSelect.Item>
                ))}
              </RadixSelect.Viewport>
            </RadixSelect.Content>
          </RadixSelect.Portal>
        </RadixSelect.Root>
      )}
    />
  );
}
