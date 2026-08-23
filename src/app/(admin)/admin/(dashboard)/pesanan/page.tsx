"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ErrorState } from "@/components/ui/error-state";
import { AdminTableSkeleton } from "@/components/ui/skeletons/admin-table-skeleton";
import { formatPhoneDisplay } from "@/domain/phone";
import { formatDateTimeJakarta } from "@/lib/format";
import type { AdminOrderListItem } from "@/server/operations/admin/list-orders";

const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "pending", label: "Menunggu Verifikasi" },
  { value: "verified", label: "Diverifikasi / Selesai" },
  { value: "rejected", label: "Ditolak / Dibatalkan" },
];

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
      params.set("limit", String(PAGE_SIZE));
      const res = await fetch(`/api/admin/orders?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("failed");
      const body = await res.json();
      setOrders(body.items ?? []);
      setTotal(body.total ?? 0);
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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex w-full flex-col gap-lg">
      {/* Header */}
      <div>
        <h2 className="font-display-lg text-display-lg text-on-surface">Pesanan</h2>
      </div>

      {/* Filters & Search */}
      <div className="mb-sm flex flex-col gap-lg md:flex-row">
        <div className="max-w-xs flex-1">
          <label className="font-body-sm mb-2 block text-body-sm text-on-surface-variant">
            Status
          </label>
          <div className="relative">
            <select
              value={status}
              onChange={(e) => updateParams({ status: e.target.value, page: "1" })}
              className="font-body-lg w-full cursor-pointer appearance-none rounded-lg border-none bg-surface-container py-3 pl-4 pr-10 text-body-lg text-on-surface focus:ring-2 focus:ring-primary"
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
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-on-surface-variant">
              <span className="material-symbols-outlined">expand_more</span>
            </div>
          </div>
        </div>
        <div className="flex-1">
          <label className="font-body-sm mb-2 block text-body-sm text-on-surface-variant">
            Cari
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Referensi, nama, atau nomor"
              className="font-body-lg w-full rounded-lg border-none bg-surface-container px-4 py-3 text-body-lg text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Data Table */}
      {state === "error" ? (
        <ErrorState variant="server" onRetry={() => void fetchOrders()} />
      ) : state === "loading" ? (
        <AdminTableSkeleton columns={7} />
      ) : (
        <div
          className="flex flex-col overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container shadow-lg"
          style={{ background: "linear-gradient(180deg, #2a1615 0%, #1a0908 100%)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-outline-variant/50 bg-surface-container-high/50">
                  <th className="font-title-md whitespace-nowrap px-6 py-4 text-title-md font-semibold text-on-surface">
                    Referensi
                  </th>
                  <th className="font-title-md whitespace-nowrap px-6 py-4 text-title-md font-semibold text-on-surface">
                    Nomor
                  </th>
                  <th className="font-title-md whitespace-nowrap px-6 py-4 text-title-md font-semibold text-on-surface">
                    Nama
                  </th>
                  <th className="font-title-md whitespace-nowrap px-6 py-4 text-title-md font-semibold text-on-surface">
                    Universitas
                  </th>
                  <th className="font-title-md whitespace-nowrap px-6 py-4 text-title-md font-semibold text-on-surface">
                    Paket
                  </th>
                  <th className="font-title-md whitespace-nowrap px-6 py-4 text-title-md font-semibold text-on-surface">
                    Status
                  </th>
                  <th
                    onClick={() => handleSort("submitted_at")}
                    className="font-title-md flex cursor-pointer select-none items-center gap-1 whitespace-nowrap px-6 py-4 text-title-md font-semibold text-on-surface transition-colors hover:text-primary"
                  >
                    Diajukan
                    <span className="material-symbols-outlined text-[16px]">
                      {sortDirection === "asc" ? "arrow_upward" : "arrow_downward"}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {orders.map((order) => {
                  const isVerified = order.status === "verified";
                  const isPending = order.status === "pending";
                  const isRejected = order.status === "rejected";

                  return (
                    <tr
                      key={order.id}
                      onClick={() => router.push(`/admin/pesanan/${order.id}`)}
                      className="cursor-pointer transition-colors hover:bg-surface-container-highest/60"
                    >
                      <td className="font-body-sm whitespace-nowrap px-6 py-4 text-body-sm font-medium text-primary">
                        <Link href={`/admin/pesanan/${order.id}`} className="hover:underline">
                          {order.order_ref}
                        </Link>
                      </td>
                      <td className="font-body-sm whitespace-nowrap px-6 py-4 text-body-sm text-on-surface">
                        {formatPhoneDisplay(order.number)}
                      </td>
                      <td className="font-body-sm whitespace-nowrap px-6 py-4 text-body-sm text-on-surface">
                        {order.full_name}
                      </td>
                      <td className="font-body-sm whitespace-nowrap px-6 py-4 text-body-sm text-on-surface-variant">
                        {order.university}
                      </td>
                      <td className="font-body-sm whitespace-nowrap px-6 py-4 text-body-sm text-on-surface-variant">
                        {order.package_id}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {isVerified ? (
                          <span className="inline-flex items-center rounded-full bg-[#1B3B24] px-2.5 py-1 text-xs font-bold text-[#81C784]">
                            Diverifikasi
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center rounded-full bg-[#4B3A14] px-2.5 py-1 text-xs font-bold text-[#FFD54F]">
                            Menunggu Verifikasi
                          </span>
                        ) : isRejected ? (
                          <span className="inline-flex items-center rounded-full bg-error-container px-2.5 py-1 text-xs font-bold text-error">
                            Ditolak
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-surface-container-high px-2.5 py-1 text-xs font-bold text-on-surface-variant">
                            {order.status}
                          </span>
                        )}
                      </td>
                      <td className="font-body-sm whitespace-nowrap px-6 py-4 text-body-sm text-on-surface-variant">
                        {formatDateTimeJakarta(new Date(order.submitted_at))}
                      </td>
                    </tr>
                  );
                })}
                {orders.length === 0 ? (
                  <tr>
                    <td className="px-6 py-12 text-center" colSpan={7}>
                      <div className="flex flex-col items-center justify-center text-on-surface-variant">
                        <p className="font-body-lg text-body-lg">
                          Tidak ada pesanan yang cocok dengan filter.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between border-t border-outline-variant/30 bg-surface-container-lowest/50 px-6 py-4">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {total} pesanan
            </span>
            <div className="flex items-center gap-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
                className="font-body-sm cursor-pointer text-body-sm text-on-surface hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-on-surface"
              >
                Sebelumnya
              </button>
              <span className="font-body-sm text-body-sm text-on-surface">
                Halaman {page} dari {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: String(page + 1) })}
                className="font-body-sm cursor-pointer text-body-sm text-on-surface hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-on-surface"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
