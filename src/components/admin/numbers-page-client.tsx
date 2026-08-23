"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ErrorState } from "@/components/ui/error-state";
import { AdminTableSkeleton } from "@/components/ui/skeletons/admin-table-skeleton";
import { AddNumberDialog } from "@/components/admin/add-number-dialog";
import { BulkAddDialog } from "@/components/admin/bulk-add-dialog";
import { NumberActions } from "@/components/admin/number-actions";
import { getEffectiveStatus } from "@/domain/number-status";
import { formatPhoneDisplay } from "@/domain/phone";
import { formatDateTimeJakarta } from "@/lib/format";
import type { AdminRole } from "@/schemas/admin";
import type { NumberRow } from "@/server/db/types";

const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "available", label: "Tersedia" },
  { value: "reserved", label: "Terkunci / Reserved" },
  { value: "pending", label: "Menunggu Pembayaran" },
  { value: "sold", label: "Terjual" },
  { value: "sold_offline", label: "Terjual Offline" },
];

function parseNumberRow(json: Record<string, unknown>): NumberRow {
  const asDate = (v: unknown) => (v ? new Date(v as string) : null);
  return {
    ...(json as unknown as NumberRow),
    reserved_at: asDate(json.reserved_at),
    reserved_until: asDate(json.reserved_until),
    sold_at: asDate(json.sold_at),
    updated_at: new Date(json.updated_at as string),
  };
}

export function NumbersPageClient({ role }: { role: AdminRole }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = searchParams.get("status") ?? "all";
  const search = searchParams.get("search") ?? "";
  const sortField = searchParams.get("sort_field") ?? "updated_at";
  const sortDirection = (searchParams.get("sort_direction") ?? "desc") as "asc" | "desc";
  const page = Number(searchParams.get("page") ?? "1");

  const [numbers, setNumbers] = useState<NumberRow[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<"loading" | "idle" | "error">("loading");
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  function updateParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    router.replace(`/admin/nomor?${params.toString()}`);
  }

  const fetchNumbers = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState("loading");
    try {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (search) params.set("search", search);
      params.set("sort_field", sortField);
      params.set("sort_direction", sortDirection);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));
      const res = await fetch(`/api/admin/numbers?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("failed");
      const body = await res.json();
      setNumbers((body.items ?? []).map(parseNumberRow));
      setTotal(body.total ?? 0);
      setState("idle");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setState("error");
    }
  }, [status, search, sortField, sortDirection, page]);

  useEffect(() => {
    void fetchNumbers();
    return () => abortRef.current?.abort();
  }, [fetchNumbers]);

  const [searchInput, setSearchInput] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleSearchChange(value: string) {
    const digitsOnly = value.replace(/\D/g, "");
    setSearchInput(digitsOnly);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParams({ search: digitsOnly, page: "1" });
    }, SEARCH_DEBOUNCE_MS);
  }

  function handleSort(field: string) {
    const nextDirection = sortField === field && sortDirection === "desc" ? "asc" : "desc";
    updateParams({ sort_field: field, sort_direction: nextDirection });
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const now = new Date();

  return (
    <div className="flex w-full flex-col gap-lg">
      {/* Header Section (Desktop) */}
      <div className="mb-sm hidden items-end justify-between md:flex">
        <div>
          <h2 className="font-display-lg inline-block border-b-2 border-primary-container pb-1 text-display-lg leading-none text-on-surface">
            Nomor
          </h2>
        </div>
        <div className="flex gap-sm">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="font-title-md hover:bg-surface-variant flex cursor-pointer items-center gap-xs rounded-full border border-outline px-md py-sm text-title-md text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            Tambah Nomor
          </button>
          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            className="font-title-md flex cursor-pointer items-center gap-xs rounded-full bg-primary-container px-md py-sm text-title-md text-on-primary-container shadow-[0_4px_14px_rgba(237,2,38,0.4)] transition-colors hover:bg-primary-container/90"
          >
            <span className="material-symbols-outlined text-[20px]">format_list_bulleted_add</span>
            Tambah Massal
          </button>
        </div>
      </div>

      {/* Action Buttons (Mobile) */}
      <div className="mb-xs flex gap-sm md:hidden">
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="font-title-md flex flex-1 items-center justify-center gap-xs rounded-lg border border-outline-variant bg-surface-container px-sm py-sm text-title-md text-on-surface"
        >
          <span className="material-symbols-outlined text-primary-container">add_circle</span>
          Tambah Nomor
        </button>
        <button
          type="button"
          onClick={() => setBulkOpen(true)}
          className="font-title-md flex flex-1 items-center justify-center gap-xs rounded-lg border border-outline-variant bg-surface-container px-sm py-sm text-title-md text-on-surface"
        >
          <span className="material-symbols-outlined text-primary-container">
            format_list_bulleted_add
          </span>
          Tambah Massal
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex w-full flex-col items-start gap-md md:flex-row md:items-end">
        <div className="relative w-full md:w-56">
          <label className="font-body-sm mb-1 block text-body-sm text-on-surface-variant">
            Status
          </label>
          <div className="relative">
            <select
              value={status}
              onChange={(e) => updateParams({ status: e.target.value, page: "1" })}
              className="font-body-lg w-full cursor-pointer appearance-none rounded-t-md border-b-2 border-outline-variant bg-surface-container py-sm pl-sm pr-lg text-body-lg text-on-surface transition-colors focus:border-primary-container focus:outline-none focus:ring-0"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className="bg-surface-container text-on-surface"
                >
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-sm top-1/2 -translate-y-1/2 text-on-surface-variant">
              expand_more
            </span>
          </div>
        </div>

        <div className="relative w-full flex-1">
          <label className="font-body-sm mb-1 hidden text-body-sm text-on-surface-variant md:block">
            Cari Nomor
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant">
              search
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Cari digit nomor..."
              className="font-body-lg w-full rounded-t-md border-b-2 border-outline-variant bg-surface-container py-sm pl-xl pr-sm text-body-lg text-on-surface transition-colors placeholder:text-on-surface-variant/50 focus:border-primary-container focus:outline-none focus:ring-0"
            />
          </div>
        </div>
      </div>

      {/* Main Content: Table or Cards */}
      {state === "error" ? (
        <ErrorState variant="server" onRetry={() => void fetchNumbers()} />
      ) : state === "loading" ? (
        <AdminTableSkeleton columns={6} />
      ) : numbers.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container p-xl text-center text-on-surface-variant">
          Tidak ada nomor yang cocok dengan filter.
        </div>
      ) : (
        <>
          {/* Data Table (Desktop View) */}
          <div className="mt-sm hidden overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-low shadow-lg md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container">
                  <th className="font-label-bold px-md py-sm text-label-bold uppercase tracking-wider text-on-surface-variant">
                    Nomor
                  </th>
                  <th className="font-label-bold px-md py-sm text-label-bold uppercase tracking-wider text-on-surface-variant">
                    Status
                  </th>
                  <th className="font-label-bold px-md py-sm text-label-bold uppercase tracking-wider text-on-surface-variant">
                    Reservasi
                  </th>
                  <th className="font-label-bold px-md py-sm text-label-bold uppercase tracking-wider text-on-surface-variant">
                    Terjual
                  </th>
                  <th
                    onClick={() => handleSort("updated_at")}
                    className="font-label-bold cursor-pointer select-none px-md py-sm text-label-bold uppercase tracking-wider text-on-surface-variant hover:text-on-surface"
                  >
                    <div className="flex items-center gap-1">
                      Diperbarui
                      <span className="material-symbols-outlined text-[16px]">
                        {sortDirection === "asc" ? "arrow_upward" : "arrow_downward"}
                      </span>
                    </div>
                  </th>
                  <th className="font-label-bold px-md py-sm text-label-bold uppercase tracking-wider text-on-surface-variant">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm">
                {numbers.map((n) => {
                  const effective = getEffectiveStatus(n, now);
                  const isAvailable = effective === "available";
                  const isReserved = effective === "reserved" || n.status === "pending";

                  return (
                    <tr
                      key={n.number}
                      className="border-b border-outline-variant/50 transition-colors hover:bg-surface-container-highest/40"
                    >
                      <td className="font-title-md whitespace-nowrap px-md py-md text-title-md text-on-surface">
                        {formatPhoneDisplay(n.number)}
                      </td>
                      <td className="whitespace-nowrap px-md py-md">
                        {isAvailable ? (
                          <span className="bg-surface-variant text-status-success font-label-bold inline-flex rounded-full border border-outline px-sm py-1 text-label-bold uppercase tracking-wider">
                            Tersedia
                          </span>
                        ) : isReserved ? (
                          <span className="font-label-bold inline-flex rounded-full border border-secondary-container bg-secondary-container/20 px-sm py-1 text-label-bold uppercase tracking-wider text-secondary-container">
                            {effective === "pending" ? "Menunggu Bayar" : "Terkunci"}
                          </span>
                        ) : (
                          <span className="font-label-bold inline-flex rounded-full border border-outline-variant bg-surface-container px-sm py-1 text-label-bold uppercase tracking-wider text-on-surface-variant">
                            {effective === "sold_offline" ? "Terjual Offline" : "Terjual"}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-md py-md text-on-surface-variant">
                        {n.reserved_until ? formatDateTimeJakarta(n.reserved_until) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-md py-md text-on-surface-variant">
                        {n.sold_at ? formatDateTimeJakarta(n.sold_at) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-md py-md text-on-surface-variant">
                        {formatDateTimeJakarta(n.updated_at)}
                      </td>
                      <td className="whitespace-nowrap px-md py-md">
                        <NumberActions
                          number={n}
                          role={role}
                          onChanged={() => void fetchNumbers()}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* List View (Mobile View) */}
          <div className="flex flex-col gap-sm md:hidden">
            {numbers.map((n) => {
              const effective = getEffectiveStatus(n, now);
              const isAvailable = effective === "available";
              const isReserved = effective === "reserved" || n.status === "pending";

              return (
                <div
                  key={n.number}
                  className={`relative overflow-hidden rounded-xl border-l-4 bg-surface-container p-md shadow-md ${
                    isAvailable
                      ? "border-l-primary-container"
                      : isReserved
                        ? "border-l-secondary-container"
                        : "border-l-outline-variant"
                  }`}
                >
                  <div className="mb-sm flex items-start justify-between">
                    <div>
                      <h3 className="font-title-md text-title-md text-on-surface">
                        {formatPhoneDisplay(n.number)}
                      </h3>
                      <span
                        className={`font-label-bold mt-1 block text-label-bold uppercase tracking-wider ${
                          isAvailable
                            ? "text-status-success"
                            : isReserved
                              ? "text-secondary-container"
                              : "text-on-surface-variant"
                        }`}
                      >
                        {isAvailable
                          ? "Tersedia"
                          : isReserved
                            ? "Terkunci"
                            : effective === "sold_offline"
                              ? "Terjual Offline"
                              : "Terjual"}
                      </span>
                    </div>
                    {n.reserved_until && (
                      <div className="text-right">
                        <span className="font-body-sm block text-body-sm text-on-surface-variant">
                          Hingga {formatDateTimeJakarta(n.reserved_until)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-sm border-t border-outline-variant/30 pt-xs">
                    <NumberActions number={n} role={role} onChanged={() => void fetchNumbers()} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-xs font-body text-body-sm text-on-surface-variant">
            <span>{total} nomor</span>
            <div className="flex items-center gap-sm">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
                className="rounded border border-outline-variant bg-surface-container px-sm py-xs text-on-surface disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: String(page + 1) })}
                className="rounded border border-outline-variant bg-surface-container px-sm py-xs text-on-surface disabled:opacity-40"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </>
      )}

      <AddNumberDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={() => void fetchNumbers()}
      />
      <BulkAddDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        onAdded={() => void fetchNumbers()}
      />
    </div>
  );
}
