import { DataFormScreen } from "@/components/student/data-form-screen";
import { requireReservation } from "@/server/guards/require-reservation";
import { getUniversities } from "@/server/operations/get-universities";

export default async function DataFormPage() {
  const reservation = await requireReservation();
  const { universities } = await getUniversities();

  return (
    <DataFormScreen
      universities={universities}
      reservedUntil={reservation.reserved_until}
      orderRef={reservation.order_ref}
    />
  );
}
