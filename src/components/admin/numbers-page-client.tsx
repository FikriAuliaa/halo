"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { AdminTableSkeleton } from "@/components/ui/skeletons/admin-table-skeleton";
import { NumbersTable } from "@/components/admin/numbers-table";
import { AddNumberDialog } from "@/components/admin/add-number-dialog";
import { BulkAddDialog } from "@/components/admin/bulk-add-dialog";
import type { AdminRole } from "@/schemas/admin";
import type { NumberRow } from "@/server/db/types";

const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "available", label: "Tersedia" },
  { value: "reserved", label: "Direservasi" },
  { value: "pending", label: "Menunggu Pembayaran" },
  { value: "sold", label: "Terjual" },
  { value: "sold_offline", label: "Terjual Offline" },
];

/** Deserializes the JSON response back into real `NumberRow`s — date
 * fields arrive as ISO strings over the wire, but `getEffectiveStatus`/
 * `canTransition` (used by the table and row actions) are typed against
 * genuine `Date`s, and a raw string compared with `<=` against a `Date`
 * doesn't do what it looks like it does. */
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

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-headline-lg text-on-surface">Nomor</h1>
        <div className="flex gap-sm">
          <Button variant="secondary" onClick={() => setAddOpen(true)}>
            Tambah Nomor
          </Button>
          <Button variant="primary" onClick={() => setBulkOpen(true)}>
            Tambah Massal
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-sm md:flex-row md:items-end">
        <div className="md:w-64">
          <SelectField
            label="Status"
            value={status}
            onValueChange={(value) => updateParams({ status: value, page: "1" })}
            options={STATUS_OPTIONS}
          />
        </div>
        <div className="flex-1">
          <TextField
            label="Cari Nomor"
            placeholder="Cari digit nomor"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
      </div>

      {state === "error" ? (
        <ErrorState variant="server" onRetry={() => void fetchNumbers()} />
      ) : state === "loading" ? (
        <AdminTableSkeleton columns={6} />
      ) : (
        <>
          <NumbersTable
            numbers={numbers}
            role={role}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            onChanged={() => void fetchNumbers()}
          />
          <div className="flex items-center justify-between font-body text-body-sm text-on-surface-variant">
            <span>{total} nomor</span>
            <div className="flex items-center gap-sm">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
                className="disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <span>
                Halaman {page} dari {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: String(page + 1) })}
                className="disabled:opacity-40"
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
