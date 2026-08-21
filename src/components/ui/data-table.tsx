"use client";

import type { ReactNode } from "react";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  sortField?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (field: string) => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

/**
 * A real `<table>` with proper `scope` and `aria-sort` (B102) — a grid of
 * `<div>`s is unusable with a screen reader. Callers own filtering/
 * sorting/pagination state and pass already-server-resolved rows; this
 * component only renders them. On mobile, falls back to a card list —
 * the same data, laid out for a narrow viewport rather than a
 * horizontally-scrolling table.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  sortField,
  sortDirection,
  onSort,
  onRowClick,
  emptyMessage = "Tidak ada data.",
}: DataTableProps<T>) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-card border border-outline-variant md:block">
        <table className="w-full text-left">
          <thead className="bg-surface-container-high">
            <tr>
              {columns.map((col) => {
                const isSorted = sortField === col.key;
                const ariaSort = col.sortable
                  ? isSorted
                    ? sortDirection === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                  : undefined;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={ariaSort}
                    className="px-sm py-sm font-body text-body-sm text-on-surface-variant"
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => onSort?.(col.key)}
                        className="flex items-center gap-1"
                      >
                        {col.header}
                        {isSorted ? (
                          <span aria-hidden="true">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        ) : null}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={() => onRowClick?.(row)}
                onKeyDown={(e) => {
                  if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onRowClick(row);
                  }
                }}
                className={`border-t border-outline-variant ${onRowClick ? "cursor-pointer hover:bg-surface-container-high" : ""}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-sm py-sm font-body text-body-sm text-on-surface">
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-sm py-md text-center font-body text-body-sm text-on-surface-variant"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-sm md:hidden">
        {rows.length === 0 ? (
          <p className="px-sm py-md text-center font-body text-body-sm text-on-surface-variant">
            {emptyMessage}
          </p>
        ) : null}
        {rows.map((row) => (
          <div
            key={rowKey(row)}
            role={onRowClick ? "button" : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            onClick={() => onRowClick?.(row)}
            onKeyDown={(e) => {
              if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onRowClick(row);
              }
            }}
            className="flex flex-col gap-1 rounded-card border border-outline-variant bg-surface-container p-sm"
          >
            {columns.map((col) => (
              <div key={col.key} className="flex items-center justify-between gap-sm">
                <span className="font-body text-body-sm text-on-surface-variant">{col.header}</span>
                <span className="font-body text-body-sm text-on-surface">{col.render(row)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
