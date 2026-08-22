import { Card, CardDivider } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/ui/status-badge";
import { formatDateTimeJakarta } from "@/lib/format";
import { formatPhoneDisplay } from "@/domain/phone";

export interface ConfirmationCardProps {
  number: string;
  packageLabel: string;
  fullName: string;
  email: string;
  submittedAt: string;
}

/** The detail card from the reference (`konfirmasi_pesanan_perfect_alignment`
 * — Nomor Terpilih, Paket, Nama, Email), plus the submission timestamp and
 * `pending` status the reference itself omits (B088). */
export function ConfirmationCard({
  number,
  packageLabel,
  fullName,
  email,
  submittedAt,
}: ConfirmationCardProps) {
  return (
    <Card className="flex flex-col gap-sm">
      <div className="flex items-center justify-between">
        <span className="font-body text-body-sm text-on-surface-variant">Status</span>
        <OrderStatusBadge status="pending" />
      </div>
      <CardDivider />
      <div className="flex items-center justify-between">
        <span className="font-body text-body-sm text-on-surface-variant">Nomor Terpilih</span>
        <span className="font-display text-title-md text-on-surface">
          {formatPhoneDisplay(number)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-body text-body-sm text-on-surface-variant">Paket</span>
        <span className="font-body text-body-lg text-on-surface">{packageLabel}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-body text-body-sm text-on-surface-variant">Nama</span>
        <span className="font-body text-body-lg text-on-surface">{fullName}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-body text-body-sm text-on-surface-variant">Email</span>
        <span className="font-body text-body-lg text-on-surface">{email}</span>
      </div>
      <CardDivider />
      <div className="flex items-center justify-between">
        <span className="font-body text-body-sm text-on-surface-variant">Diajukan</span>
        <span className="font-body text-body-sm text-on-surface">
          {formatDateTimeJakarta(new Date(submittedAt))}
        </span>
      </div>
    </Card>
  );
}
