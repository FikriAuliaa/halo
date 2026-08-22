"use client";

import { SelectableCard } from "@/components/ui/selectable-card";

export interface NumberCardProps {
  number: string;
  display: string;
  selected: boolean;
  onSelect: () => void;
}

export function NumberCard({ display, selected, onSelect }: NumberCardProps) {
  return (
    <SelectableCard
      selected={selected}
      onSelect={onSelect}
      aria-label={`Nomor ${display}`}
      className="flex items-center justify-center px-md py-lg"
    >
      <span className="font-display text-title-md tracking-wide text-on-surface">{display}</span>
    </SelectableCard>
  );
}
