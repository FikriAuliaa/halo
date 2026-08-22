"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StudentShell } from "./student-shell";
import { StepIndicator } from "./step-indicator";
import { NumberCard } from "./number-card";
import { RefreshButton } from "./refresh-button";
import { TrackingTokenDialog } from "./tracking-token-dialog";
import { ResponsiveGrid } from "@/components/ui/responsive-grid";
import { NumberGridSkeleton } from "@/components/ui/skeletons/number-grid-skeleton";
import { EmptyState, EMPTY_STATE_PRESETS } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { TextField } from "@/components/ui/text-field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useReservation } from "@/hooks/use-reservation";

export interface NumberItem {
  id: string;
  number: string;
  display: string;
}

export interface NumberListProps {
  initialNumbers: NumberItem[];
  initialError: boolean;
  /** From `?reason=` on redirect back here (B071's flow guard). */
  reason: "expired" | "taken-over" | "no-reservation" | null;
}

const SEARCH_DEBOUNCE_MS = 300;

const REASON_MESSAGES: Record<NonNullable<NumberListProps["reason"]>, string> = {
  expired: "Waktu reservasi Anda telah berakhir. Silakan pilih nomor lagi.",
  "taken-over": "Nomor tersebut sudah diambil pihak lain. Silakan pilih nomor lain.",
  "no-reservation": "Silakan pilih nomor untuk memulai pemesanan.",
};

/**
 * The number selection screen (B072/B073) — owns the full interactive
 * shell (StudentShell + sticky CTA) since selection state lives here; the
 * Server Component page above it only fetches the initial sample.
 */
export function NumberList({ initialNumbers, initialError, reason }: NumberListProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { reserve, loading: reserving } = useReservation();

  const [numbers, setNumbers] = useState(initialNumbers);
  const [status, setStatus] = useState<"idle" | "loading" | "error">(
    initialError ? "error" : "idle",
  );
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [savedCredentials, setSavedCredentials] = useState<{
    orderRef: string;
    trackingToken: string;
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  async function fetchNumbers(
    opts: { suffix?: string | undefined; exclude?: string[] | undefined } = {},
  ) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("loading");
    try {
      const params = new URLSearchParams();
      if (opts.suffix) params.set("suffix", opts.suffix);
      for (const n of opts.exclude ?? []) params.append("exclude", n);
      const res = await fetch(`/api/numbers?${params.toString()}`, { signal: controller.signal });
      if (!res.ok) throw new Error("Gagal memuat nomor.");
      const body = await res.json();
      setNumbers(body.numbers);
      setStatus("idle");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("error");
    }
  }

  function handleSearchChange(raw: string) {
    const digitsOnly = raw.replace(/\D/g, "").slice(0, 8);
    setSearch(digitsOnly);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchNumbers({ suffix: digitsOnly || undefined });
    }, SEARCH_DEBOUNCE_MS);
  }

  function handleRefresh() {
    setRefreshing(true);
    void fetchNumbers({
      suffix: search || undefined,
      exclude: numbers.map((n) => n.number),
    }).finally(() => setRefreshing(false));
  }

  async function handleContinue() {
    if (!selected) return;
    try {
      const result = await reserve(selected);
      if (result.tracking_token) {
        // Only ever non-null on the call that actually creates the
        // reservation — the one moment this plaintext exists (B062).
        setSavedCredentials({ orderRef: result.order_ref, trackingToken: result.tracking_token });
      } else {
        router.push("/paket");
      }
    } catch {
      // The chosen number was taken between render and tap — a normal
      // race students will genuinely hit (B073), not a crash: it's
      // quietly dropped and the list refreshes.
      showToast("info", "Nomor tersebut baru saja dipesan orang lain. Silakan pilih nomor lain.");
      setSelected(null);
      void fetchNumbers({ suffix: search || undefined, exclude: [selected] });
    }
  }

  return (
    <StudentShell
      bottomBar={
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!selected}
          loading={reserving}
          onClick={handleContinue}
        >
          Lanjut Pilih Paket
        </Button>
      }
    >
      <div className="flex flex-col gap-lg">
        <StepIndicator currentStep={1} />

        <div className="flex flex-col gap-xs">
          <h1 className="font-display text-headline-lg-mobile text-on-surface md:text-headline-lg">
            Pilih Nomor Halo Keinginanmu
          </h1>
          <p className="font-body text-body-sm text-on-surface-variant">
            Nomor yang kamu pilih akan dikunci untuk kamu selama proses pemesanan berlangsung.
          </p>
        </div>

        {reason ? (
          <div
            role="status"
            className="rounded-field bg-surface-container-high px-sm py-sm font-body text-body-sm text-on-surface"
          >
            {REASON_MESSAGES[reason]}
          </div>
        ) : null}

        {status === "error" ? (
          <ErrorState
            variant="network"
            onRetry={() => fetchNumbers({ suffix: search || undefined })}
          />
        ) : (
          <>
            <TextField
              label="Cari 4 digit terakhir"
              placeholder="Contoh: 1234"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              inputMode="numeric"
            />
            <RefreshButton onRefresh={handleRefresh} loading={refreshing} />

            {status === "loading" && numbers.length === 0 ? (
              <NumberGridSkeleton />
            ) : numbers.length === 0 ? (
              <EmptyState
                {...(search
                  ? EMPTY_STATE_PRESETS.noSearchResults
                  : EMPTY_STATE_PRESETS.noNumbersAvailable)}
                onAction={() => fetchNumbers({ suffix: search || undefined })}
              />
            ) : (
              <div role="radiogroup" aria-label="Pilih nomor Halo">
                <ResponsiveGrid behavior="grid-always">
                  {numbers.map((n) => (
                    <NumberCard
                      key={n.number}
                      number={n.number}
                      display={n.display}
                      selected={selected === n.number}
                      onSelect={() => setSelected(n.number)}
                    />
                  ))}
                </ResponsiveGrid>
              </div>
            )}
          </>
        )}
      </div>

      {savedCredentials ? (
        <TrackingTokenDialog
          open
          orderRef={savedCredentials.orderRef}
          trackingToken={savedCredentials.trackingToken}
          onContinue={() => router.push("/paket")}
        />
      ) : null}
    </StudentShell>
  );
}
