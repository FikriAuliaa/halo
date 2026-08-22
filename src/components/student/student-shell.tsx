import type { ReactNode } from "react";

export interface StudentShellProps {
  children: ReactNode;
  /** Rendered beneath the header — the ReservationTimer once active. */
  timerSlot?: ReactNode;
  /** The fixed bottom action bar (primary CTA). */
  bottomBar?: ReactNode;
  /**
   * "narrow" keeps the 480px column at every width (forms, payment,
   * confirmation — DESIGN.md §9's "comfortable measure, not full width").
   * "wide" grows the column at >=768px/1024px so a multi-column
   * ResponsiveGrid (number/package screens) has room to actually be
   * multi-column, rather than being squeezed into 480px regardless of
   * viewport (B046).
   */
  width?: "narrow" | "wide";
}

const WIDTH_CLASSES: Record<NonNullable<StudentShellProps["width"]>, string> = {
  narrow: "max-w-[480px]",
  wide: "max-w-[480px] md:max-w-[720px] lg:max-w-[960px]",
};

/**
 * The shared shell for every student screen, lifted from the reference's
 * repeated structure across all five HTML files: a sticky header with the
 * "5G / Powered by AI" + "Halo" wordmark lockup on a gradient-to-transparent
 * scrim, a scrollable content region, and a fixed bottom CTA bar with a
 * black gradient fade (DESIGN.md, B044). At >=768px the ambient gradient
 * field (globals.css, applied at the document body) surrounds whichever
 * column width this screen calls for (DESIGN.md §9) — see ResponsiveGrid
 * (B046) for the grid/scroller behavior inside `children`.
 */
export function StudentShell({
  children,
  timerSlot,
  bottomBar,
  width = "narrow",
}: StudentShellProps) {
  return (
    <div className={`mx-auto flex min-h-screen w-full flex-col ${WIDTH_CLASSES[width]}`}>
      <header className="sticky top-0 z-40 flex items-center justify-between bg-gradient-to-b from-surface-container-highest to-transparent px-container-margin py-md">
        <div className="flex flex-col leading-none">
          <span className="font-display text-[32px] italic tracking-tighter text-white">5G</span>
          <span className="text-[8px] font-normal uppercase italic tracking-wider text-gray-400">
            Powered by AI
          </span>
        </div>
        <div className="font-display text-[32px] font-extrabold tracking-tight text-white">
          Halo
        </div>
      </header>

      {timerSlot ? <div className="px-container-margin py-sm">{timerSlot}</div> : null}

      <main
        className={`flex-1 overflow-y-auto px-container-margin pt-lg ${bottomBar ? "pb-[120px] md:pb-lg" : "pb-lg"}`}
      >
        {children}
      </main>

      {bottomBar ? (
        // Fixed on mobile (where a persistent CTA earns its screen-space
        // cost); becomes an ordinary in-flow bar from >=768px, where the
        // viewport no longer needs the CTA pinned (DESIGN.md §9, B046).
        <div
          className={`fixed inset-x-0 bottom-0 z-40 mx-auto w-full bg-gradient-to-t from-black via-black/80 to-transparent px-container-margin pt-xl md:static md:bg-none md:pt-md ${WIDTH_CLASSES[width]}`}
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}
        >
          {bottomBar}
        </div>
      ) : null}
    </div>
  );
}
