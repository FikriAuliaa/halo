"use client";

import { TextField } from "@/components/ui/text-field";
import { SelectField } from "@/components/ui/select-field";

export interface FilterBarProps {
  status: string;
  onStatusChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "pending", label: "Menunggu Verifikasi" },
  { value: "verified", label: "Terverifikasi" },
  { value: "rejected", label: "Ditolak" },
];

/** Filters reflected in the URL by the caller (B102) — this component is
 * controlled, no state of its own. */
export function FilterBar({ status, onStatusChange, search, onSearchChange }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-sm md:flex-row md:items-end">
      <div className="md:w-64">
        <SelectField
          label="Status"
          value={status}
          onValueChange={onStatusChange}
          options={STATUS_OPTIONS}
        />
      </div>
      <div className="flex-1">
        <TextField
          label="Cari"
          placeholder="Referensi, nama, atau nomor"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}
