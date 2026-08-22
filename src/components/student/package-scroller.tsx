"use client";

import { useEffect, useState } from "react";
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

const APPROX_TTL_MS = 15 * 60_000; // cosmetic only — the progress bar's start reference; the digits themselves come from the server.

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
    router.push("/data");
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
          Lanjut Isi Data Diri
        </Button>
      }
    >
      <div className="flex flex-col gap-lg">
        <StepIndicator currentStep={2} />

        <div className="flex flex-col gap-xs">
          <h1 className="font-display text-headline-lg-mobile text-on-surface md:text-headline-lg">
            Koneksi Makin Puas dengan Paket Halo+
          </h1>
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
          <div role="radiogroup" aria-label="Pilih paket Halo+">
            <ResponsiveGrid behavior="scroll-until-desktop">
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
        )}
      </div>
    </StudentShell>
  );
}
