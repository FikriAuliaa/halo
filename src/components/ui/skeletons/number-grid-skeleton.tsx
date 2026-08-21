import { Skeleton } from "../skeleton";

/**
 * Matches the real number card's fixed 72px height exactly (DESIGN.md §7,
 * the number-selection screen) so nothing shifts when real data arrives.
 */
export function NumberGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Memuat nomor tersedia"
      className="flex flex-col gap-sm"
    >
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-[72px] w-full" />
      ))}
    </div>
  );
}
