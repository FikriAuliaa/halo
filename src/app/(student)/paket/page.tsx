import { PackageScroller } from "@/components/student/package-scroller";
import { requireReservation } from "@/server/guards/require-reservation";
import { getPackages } from "@/server/operations/get-packages";
import type { PackageEntry } from "@/server/db/types";

export default async function PackageSelectionPage() {
  const reservation = await requireReservation();

  let initialPackages: PackageEntry[] = [];
  let initialError = false;
  try {
    const result = await getPackages();
    initialPackages = result.packages;
  } catch {
    initialError = true;
  }

  return (
    <PackageScroller
      initialPackages={initialPackages}
      initialError={initialError}
      reservedUntil={reservation.reserved_until}
    />
  );
}
