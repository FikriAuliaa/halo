"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StudentShell } from "./student-shell";
import { StepIndicator } from "./step-indicator";
import { ReservationTimer } from "./reservation-timer";
import { PackageCard } from "./package-card";
import { ResponsiveGrid } from "@/components/ui/responsive-grid";
import { PackageScrollerSkeleton } from "@/components/ui/skeletons/package-scroller-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { useReservation } from "@/hooks/use-reservation";
import { readFlowState, writeFlowState } from "@/lib/flow-state";
import type { PackageEntry } from "@/server/db/types";

const APPROX_TTL_MS = 15 * 60_000;

export interface PackageScrollerProps {
  initialPackages: PackageEntry[];
  initialError: boolean;
  reservedUntil: string;
}

export function PackageScroller({
  initialPackages,
  initialError,
  reservedUntil: initialReservedUntil,
}: PackageScrollerProps) {
  const router = useRouter();
  const { reservedUntil, now, revalidate } = useReservation();
  const effectiveReservedUntil = reservedUntil ?? new Date(initialReservedUntil);

  const [packages, setPackages] = useState(initialPackages);
  const [status, setStatus] = useState<"idle" | "loading" | "error">(
    initialError ? "error" : "idle",
  );
  const [selected, setSelected] = useState<string | null>(() => readFlowState().selectedPackageId);
  const [staleCleared, setStaleCleared] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  function checkScroll() {
    if (!scrollerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollerRef.current;
    setCanScrollLeft(scrollLeft > 15);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 15);
  }

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [packages]);

  function handleScroll(direction: "left" | "right") {
    if (!scrollerRef.current) return;
    const delta = scrollerRef.current.clientWidth * 0.75;
    scrollerRef.current.scrollBy({
      left: direction === "left" ? -delta : delta,
      behavior: "smooth",
    });
  }

  useEffect(() => {
    if (selected && packages.length > 0 && !packages.some((p) => p.id === selected)) {
      setSelected(null);
      setStaleCleared(true);
      writeFlowState({ selectedPackageId: null });
    }
  }, [packages, selected]);

  async function retryLoad() {
    setStatus("loading");
    try {
      const res = await fetch("/api/packages");
      if (!res.ok) throw new Error("failed");
      const body = await res.json();
      setPackages(body.packages);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  async function handleExpire() {
    const result = await revalidate();
    if (!result) router.push("/?reason=expired");
  }

  function handleContinue() {
    if (!selected) return;
    writeFlowState({ selectedPackageId: selected });
    router.push("/bayar");
  }

  return (
    <StudentShell
      width="wide"
      timerSlot={
        <ReservationTimer
          reservedAt={new Date(effectiveReservedUntil.getTime() - APPROX_TTL_MS)}
          reservedUntil={effectiveReservedUntil}
          onExpire={() => void handleExpire()}
          now={now}
        />
      }
      bottomBar={
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!selected}
          onClick={handleContinue}
        >
          Lanjut ke Pembayaran
        </Button>
      }
    >
      <div className="flex flex-col gap-lg">
        <StepIndicator currentStep={3} />

        <div className="flex flex-col gap-xs">
          <h1 className="font-display text-headline-lg-mobile text-on-surface md:text-headline-lg">
            Koneksi Makin Puas dengan Paket Halo+
          </h1>
          <p className="flex items-center justify-between font-body text-body-sm text-on-surface-variant">
            <span>Pilih paket internet terbaik untuk nomor pilihanmu.</span>
            <span className="flex items-center gap-1 text-[12px] font-medium text-secondary-container lg:hidden">
              <span className="material-symbols-outlined text-[16px]">swipe</span> Geser pilihan
            </span>
          </p>
        </div>

        {staleCleared ? (
          <div
            role="status"
            className="rounded-field bg-surface-container-high px-sm py-sm font-body text-body-sm text-on-surface"
          >
            Paket yang sebelumnya kamu pilih sudah tidak tersedia. Silakan pilih paket lain.
          </div>
        ) : null}

        {status === "error" ? (
          <ErrorState variant="server" onRetry={() => void retryLoad()} />
        ) : status === "loading" ? (
          <PackageScrollerSkeleton />
        ) : (
          <div className="group relative">
            {/* Mobile Carousel Left Arrow */}
            <button
              type="button"
              onClick={() => handleScroll("left")}
              disabled={!canScrollLeft}
              aria-label="Geser paket ke kiri"
              className={`absolute -left-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-outline-variant/50 bg-surface-container-high/90 text-on-surface shadow-xl backdrop-blur transition-all active:scale-95 lg:hidden ${
                !canScrollLeft ? "pointer-events-none opacity-0" : "opacity-100"
              }`}
            >
              <span className="material-symbols-outlined text-[24px]">chevron_left</span>
            </button>

            <div role="radiogroup" aria-label="Pilih paket Halo+">
              <ResponsiveGrid behavior="scroll-until-desktop" containerRef={scrollerRef}>
                {packages.map((pkg) => (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    selected={selected === pkg.id}
                    onSelect={() => setSelected(pkg.id)}
                  />
                ))}
              </ResponsiveGrid>
            </div>

            {/* Mobile Carousel Right Arrow */}
            <button
              type="button"
              onClick={() => handleScroll("right")}
              disabled={!canScrollRight}
              aria-label="Geser paket ke kanan"
              className={`absolute -right-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-outline-variant/50 bg-surface-container-high/90 text-on-surface shadow-xl backdrop-blur transition-all active:scale-95 lg:hidden ${
                !canScrollRight ? "pointer-events-none opacity-0" : "opacity-100"
              }`}
            >
              <span className="material-symbols-outlined text-[24px]">chevron_right</span>
            </button>
          </div>
        )}
      </div>
    </StudentShell>
  );
}
