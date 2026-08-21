import { Skeleton } from "../skeleton";

/**
 * Matches `FieldWrapper`'s real layout (label row + input row) for the
 * four order-form fields (DESIGN.md §7, the personal-data screen).
 */
export function OrderFormSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Memuat formulir"
      className="flex flex-col gap-md"
    >
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex flex-col gap-1 pt-2">
          <Skeleton className="h-[18px] w-24" />
          <Skeleton className="h-[44px] w-full" />
        </div>
      ))}
    </div>
  );
}
