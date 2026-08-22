import { PaymentScreen } from "@/components/student/payment-screen";
import { requireReservation } from "@/server/guards/require-reservation";
import { getPackages } from "@/server/operations/get-packages";
import { getPaymentConfig } from "@/server/operations/get-payment-config";
import { formatPhoneDisplay } from "@/domain/phone";
import type { PackageEntry } from "@/server/db/types";

export default async function PaymentPage() {
  const reservation = await requireReservation();
  const { packages } = await getPackages();

  let qrImageUrl: string | null = null;
  let paymentLabel = "";
  try {
    const paymentConfig = await getPaymentConfig();
    qrImageUrl = paymentConfig.qr_image_url;
    paymentLabel = paymentConfig.payment_label;
  } catch {
    // Missing config renders as an explicit error state in QrisPanel.
  }

  return (
    <PaymentScreen
      numberDisplay={formatPhoneDisplay(reservation.number)}
      packages={packages as PackageEntry[]}
      orderRef={reservation.order_ref}
      reservedUntil={reservation.reserved_until}
      qrImageUrl={qrImageUrl}
      paymentLabel={paymentLabel}
    />
  );
}
