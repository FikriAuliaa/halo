"use client";

import { getEffectiveStatus } from "@/domain/number-status";
import { formatPhoneDisplay } from "@/domain/phone";
import { formatDateTimeJakarta } from "@/lib/format";
import type { AdminRole } from "@/schemas/admin";
import type { NumberRow } from "@/server/db/types";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { NumberStatusBadge } from "@/components/ui/status-badge";
import { NumberActions } from "./number-actions";

export interface NumbersTableProps {
  numbers: NumberRow[];
  role: AdminRole;
  sortField: string;
  sortDirection: "asc" | "desc";
  onSort: (field: string) => void;
  onChanged: () => void;
}

/**
 * B106's inventory table. Shows the **effective** status, not the raw
 * stored one — a `reserved` row whose TTL already lapsed renders as
 * `available` with a small "(tersimpan: reserved)" note, so an admin
 * never mistakes a stale row for a still-held number (the janitor may
 * not have caught up to it yet; `getEffectiveStatus` is the same
 * function `reserveNumber`'s own guard uses, so the two can never
 * disagree about what "available" means).
 */
export function NumbersTable({
  numbers,
  role,
  sortField,
  sortDirection,
  onSort,
  onChanged,
}: NumbersTableProps) {
  const now = new Date();

  const columns: DataTableColumn<NumberRow>[] = [
    {
      key: "number",
      header: "Nomor",
      sortable: true,
      render: (n) => <span className="font-display">{formatPhoneDisplay(n.number)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (n) => {
        const effective = getEffectiveStatus(n, now);
        const stale = effective !== n.status;
        return (
          <div className="flex flex-col gap-0.5">
            <NumberStatusBadge status={effective} />
            {stale ? (
              <span className="font-body text-body-sm text-on-surface-variant">
                (tersimpan: {n.status}, kedaluwarsa)
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "reservation",
      header: "Reservasi",
      render: (n) => {
        const effective = getEffectiveStatus(n, now);
        if (effective !== "reserved" && n.status !== "pending") return "—";
        if (!n.reserved_until) return n.order_ref ? `Ref: ${n.order_ref}` : "—";
        return formatDateTimeJakarta(n.reserved_until);
      },
    },
    {
      key: "sold_at",
      header: "Terjual",
      sortable: true,
      render: (n) => (n.sold_at ? formatDateTimeJakarta(n.sold_at) : "—"),
    },
    {
      key: "updated_at",
      header: "Diperbarui",
      sortable: true,
      render: (n) => formatDateTimeJakarta(n.updated_at),
    },
    {
      key: "actions",
      header: "Aksi",
      render: (n) => <NumberActions number={n} role={role} onChanged={onChanged} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={numbers}
      rowKey={(n) => n.number}
      sortField={sortField}
      sortDirection={sortDirection}
      onSort={onSort}
      emptyMessage="Tidak ada nomor yang cocok dengan filter."
    />
  );
}
