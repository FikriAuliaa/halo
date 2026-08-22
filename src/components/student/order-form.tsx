"use client";

import { TextField } from "@/components/ui/text-field";
import { EmailField } from "@/components/ui/email-field";
import { PhoneField } from "@/components/ui/phone-field";
import { SelectField } from "@/components/ui/select-field";

export interface OrderFormValues {
  full_name: string;
  university: string;
  whatsapp: string;
  email: string;
}

export type OrderFormErrors = Partial<Record<keyof OrderFormValues, string>>;

export interface OrderFormProps {
  universities: string[];
  values: OrderFormValues;
  errors: OrderFormErrors;
  onChange: (values: OrderFormValues) => void;
  onBlurField: (field: keyof OrderFormValues) => void;
}

/** The personal-data form fields (B078) — validation itself lives one
 * level up (the shared Zod schema, `src/schemas/order.ts`, run on blur
 * and on submit), this component is purely controlled inputs. */
// `exactOptionalPropertyTypes` forbids passing `error={undefined}`
// explicitly — every field's `error?: string` means "may be omitted,"
// not "may be `undefined`." This narrows a possibly-undefined message
// into either an omitted prop or a present one.
function errorProp(message: string | undefined): { error: string } | Record<string, never> {
  return message === undefined ? {} : { error: message };
}

export function OrderForm({ universities, values, errors, onChange, onBlurField }: OrderFormProps) {
  function set<K extends keyof OrderFormValues>(field: K, value: OrderFormValues[K]) {
    onChange({ ...values, [field]: value });
  }

  return (
    <div className="flex flex-col gap-md">
      <TextField
        label="Nama Lengkap"
        required
        value={values.full_name}
        onChange={(e) => set("full_name", e.target.value)}
        onBlur={() => onBlurField("full_name")}
        {...errorProp(errors.full_name)}
      />
      <SelectField
        label="Universitas"
        required
        placeholder="Pilih universitas"
        value={values.university || undefined}
        onValueChange={(v) => {
          set("university", v);
          onBlurField("university");
        }}
        options={universities.map((u) => ({ value: u, label: u }))}
        {...errorProp(errors.university)}
      />
      <PhoneField
        label="Nomor WhatsApp"
        required
        value={values.whatsapp}
        onValueChange={(v) => set("whatsapp", v)}
        onBlur={() => onBlurField("whatsapp")}
        {...errorProp(errors.whatsapp)}
      />
      <EmailField
        label="Email"
        required
        value={values.email}
        onChange={(e) => set("email", e.target.value)}
        onBlur={() => onBlurField("email")}
        {...errorProp(errors.email)}
      />
    </div>
  );
}
