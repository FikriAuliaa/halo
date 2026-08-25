"use client";

import { SelectableCard } from "@/components/ui/selectable-card";

export interface NumberCardProps {
  number: string;
  display: string;
  selected: boolean;
  taken?: boolean | undefined;
  takenLabel?: string | undefined;
  onSelect: () => void;
}

export function NumberCard({
  display,
  selected,
  taken = false,
  takenLabel = "Sudah Diambil",
  onSelect,
}: NumberCardProps) {
  return (
    <SelectableCard
      selected={selected && !taken}
      disabled={taken}
      onSelect={onSelect}
      aria-label={`Nomor ${display}${taken ? " (Sudah diambil pembeli lain)" : ""}`}
      className="relative flex flex-col items-center justify-center overflow-hidden px-md py-md"
    >
      <span
        className={`font-display text-title-md tracking-wide ${
          taken ? "text-on-surface-variant/70 line-through" : "text-on-surface"
        }`}
      >
        {display}
      </span>
      {taken && (
        <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-error/30 bg-error/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-error">
          <span className="material-symbols-outlined text-[12px]">lock</span>
          {takenLabel}
        </span>
      )}
    </SelectableCard>
  );
}
