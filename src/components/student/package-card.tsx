"use client";

import { SelectableCard } from "@/components/ui/selectable-card";
import { CardDivider } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataDisplay } from "@/components/ui/data-display";
import { formatCurrencyIDR } from "@/lib/format";
import type { PackageEntry } from "@/server/db/types";

export interface PackageCardProps {
  pkg: PackageEntry;
  selected: boolean;
  onSelect: () => void;
}

export function PackageCard({ pkg, selected, onSelect }: PackageCardProps) {
  return (
    <SelectableCard
      surface="gradient"
      selected={selected}
      onSelect={onSelect}
      aria-label={`Paket ${pkg.label}`}
      className="flex w-[85vw] max-w-[380px] shrink-0 snap-center flex-col gap-sm p-lg lg:w-auto"
    >
      {pkg.recommended ? (
        <Badge variant="orange" className="self-start">
          Rekomendasi
        </Badge>
      ) : null}

      <span className="font-body text-body-sm text-on-surface-variant">{pkg.label}</span>
      <div className="flex items-baseline gap-1">
        <span className="font-display text-title-md text-on-surface">Rp</span>
        <span className="font-display text-data-display text-on-surface">
          {pkg.price.toLocaleString("id-ID")}
        </span>
      </div>
      {pkg.price_status === "draft" ? (
        <span className="font-body text-body-sm text-on-surface-variant">
          * Harga sementara, dapat berubah
        </span>
      ) : null}

      <CardDivider />

      <div className="flex flex-col gap-xs">
        <DataDisplay value={pkg.quota_internet_gb} unit="GB" />
        <span className="font-body text-body-sm text-on-surface-variant">
          {pkg.quota_roaming_gb} GB Roaming &middot; {pkg.voice_minutes} Menit &middot;{" "}
          {pkg.sms_count} SMS
        </span>
      </div>

      <div className="font-body text-body-sm text-on-surface-variant">
        {formatCurrencyIDR(pkg.price)} / bulan
      </div>
    </SelectableCard>
  );
}
