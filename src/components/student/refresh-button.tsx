"use client";

export interface RefreshButtonProps {
  onRefresh: () => void;
  loading?: boolean;
}

/** "Refresh Nomor Halo" pill (B072). The icon spins while a refresh is
 * in flight; `motion-reduce:animate-none` respects reduced-motion. */
export function RefreshButton({ onRefresh, loading = false }: RefreshButtonProps) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={loading}
      className="rounded-pill flex items-center gap-xs self-start border border-outline-variant bg-surface-container px-md py-xs font-body text-body-sm text-on-surface transition-colors hover:border-outline disabled:opacity-60"
    >
      <span
        aria-hidden="true"
        className={`material-symbols-outlined text-[18px] ${loading ? "motion-safe:animate-spin motion-reduce:animate-none" : ""}`}
      >
        refresh
      </span>
      Refresh Nomor Halo
    </button>
  );
}
