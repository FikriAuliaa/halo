import { Card, CardDivider } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { formatCurrencyIDR } from "@/lib/format";

export interface OrderSummaryProps {
  numberDisplay: string;
  packageLabel: string;
  packagePrice: number;
  orderRef: string;
  uniqueCode?: number | null | undefined;
}

/** "Nomor Pilihan" / "Paket" / "Kode Pemesanan" summary block (B082) —
 * `order_ref` is the one minted at reservation time (B062), shown here
 * before submission exists, exactly matching the design's promise. */
export function OrderSummary({
  numberDisplay,
  packageLabel,
  packagePrice,
  orderRef,
  uniqueCode,
}: OrderSummaryProps) {
  const code = uniqueCode ?? 0;
  const totalAmount = packagePrice + code;

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
      {code > 0 ? (
        <>
          <CardDivider />
          <div className="flex items-center justify-between">
            <span className="font-body text-body-sm text-on-surface-variant">
              Kode Transfer Unik
            </span>
            <span className="font-body text-body-sm font-semibold text-secondary">
              +{formatCurrencyIDR(code)}
            </span>
          </div>
          <CardDivider />
          <div className="flex items-center justify-between rounded-lg bg-surface-container-high p-sm">
            <div className="flex flex-col">
              <span className="text-label-sm font-body font-bold text-on-surface">
                Total Pembayaran
              </span>
              <span className="font-body text-xs text-on-surface-variant">
                Harus tepat sesuai nominal
              </span>
            </div>
            <div className="flex items-center gap-sm">
              <span className="text-headline-sm font-display font-bold text-primary">
                {formatCurrencyIDR(totalAmount)}
              </span>
              <CopyButton value={String(totalAmount)} label="Salin Nominal" />
            </div>
          </div>
        </>
      ) : null}
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
