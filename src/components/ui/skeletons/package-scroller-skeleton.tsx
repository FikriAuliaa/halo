import { Skeleton } from "../skeleton";

/**
 * Matches the real package card's `w-[85vw] max-w-[380px]` width and its
 * three-stat-block internal layout (DESIGN.md §7, the package screen).
 */
export function PackageScrollerSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Memuat paket data"
      className="flex gap-md overflow-x-hidden px-container-margin"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="w-[85vw] max-w-[380px] flex-shrink-0">
          <Skeleton className="h-14 w-full rounded-b-none" />
          <div className="flex flex-col gap-sm rounded-t-none bg-surface-container-high p-sm">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
