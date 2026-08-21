import { Skeleton } from "../skeleton";

/**
 * Matches the admin table's dense row height (36-44px, DESIGN.md §10 —
 * admin screens are denser than the 72px student-flow cards).
 */
export function AdminTableSkeleton({ rows = 8, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div role="status" aria-busy="true" aria-label="Memuat data" className="flex flex-col gap-1">
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex h-10 items-center gap-md">
          {Array.from({ length: columns }, (_, col) => (
            <Skeleton key={col} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
