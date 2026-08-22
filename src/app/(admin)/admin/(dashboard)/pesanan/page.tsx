"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FilterBar } from "@/components/admin/filter-bar";
import { OrdersTable } from "@/components/admin/orders-table";
import { ErrorState } from "@/components/ui/error-state";
import { AdminTableSkeleton } from "@/components/ui/skeletons/admin-table-skeleton";
import type { AdminOrderListItem } from "@/server/operations/admin/list-orders";

const SEARCH_DEBOUNCE_MS = 300;

/**
 * `/admin/pesanan` (B102). Filters/sort/page are reflected in the URL
 * (`router.replace`, not `push` — a filter tweak shouldn't spam back-
 * history) so a filtered view survives a refresh and can be shared.
 */
export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = searchParams.get("status") ?? "all";
  const search = searchParams.get("search") ?? "";
  const sortField = searchParams.get("sort_field") ?? "submitted_at";
  const sortDirection = (searchParams.get("sort_direction") ?? "desc") as "asc" | "desc";
  const page = Number(searchParams.get("page") ?? "1");

  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<"loading" | "idle" | "error">("loading");
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
    router.replace(`/admin/pesanan?${params.toString()}`);
  }

  const fetchOrders = useCallback(async () => {
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
      const res = await fetch(`/api/admin/orders?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("failed");
      const body = await res.json();
      setOrders(body.items);
      setTotal(body.total);
      setState("idle");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setState("error");
    }
  }, [status, search, sortField, sortDirection, page]);

  useEffect(() => {
    void fetchOrders();
    return () => abortRef.current?.abort();
  }, [fetchOrders]);

  const [searchInput, setSearchInput] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParams({ search: value, page: "1" });
    }, SEARCH_DEBOUNCE_MS);
  }

  function handleSort(field: string) {
    const nextDirection = sortField === field && sortDirection === "desc" ? "asc" : "desc";
    updateParams({ sort_field: field, sort_direction: nextDirection });
  }

  const totalPages = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="font-display text-headline-lg text-on-surface">Pesanan</h1>

      <FilterBar
        status={status}
        onStatusChange={(value) => updateParams({ status: value, page: "1" })}
        search={searchInput}
        onSearchChange={handleSearchChange}
      />

      {state === "error" ? (
        <ErrorState variant="server" onRetry={() => void fetchOrders()} />
      ) : state === "loading" ? (
        <AdminTableSkeleton />
      ) : (
        <>
          <OrdersTable
            orders={orders}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
          <div className="flex items-center justify-between font-body text-body-sm text-on-surface-variant">
            <span>{total} pesanan</span>
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
    </div>
  );
}
