import { Card, CardDivider } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { formatCurrencyIDR } from "@/lib/format";

export interface OrderSummaryProps {
  numberDisplay: string;
  packageLabel: string;
  packagePrice: number;
  orderRef: string;
}

/** "Nomor Pilihan" / "Paket" / "Kode Pemesanan" summary block (B082) —
 * `order_ref` is the one minted at reservation time (B062), shown here
 * before submission exists, exactly matching the design's promise. */
export function OrderSummary({
  numberDisplay,
  packageLabel,
  packagePrice,
  orderRef,
}: OrderSummaryProps) {
  return (
    <Card className="flex flex-col gap-sm">
      <div className="flex items-center justify-between">
        <span className="font-body text-body-sm text-on-surface-variant">Nomor Pilihan</span>
        <span className="font-display text-title-md text-on-surface">{numberDisplay}</span>
      </div>
      <CardDivider />
      <div className="flex items-center justify-between">
        <span className="font-body text-body-sm text-on-surface-variant">Paket</span>
        <div className="text-right">
          <div className="font-body text-body-lg text-on-surface">{packageLabel}</div>
          <div className="font-body text-body-sm text-on-surface-variant">
            {formatCurrencyIDR(packagePrice)}
          </div>
        </div>
      </div>
      <CardDivider />
      <div className="flex items-center justify-between">
        <span className="font-body text-body-sm text-on-surface-variant">Kode Pemesanan</span>
        <div className="flex items-center gap-sm">
          <span className="font-display text-title-md text-on-surface">{orderRef}</span>
          <CopyButton value={orderRef} />
        </div>
      </div>
    </Card>
  );
}
