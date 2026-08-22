"use client";

import { useRouter } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { OrderStatusBadge } from "@/components/ui/status-badge";
import { formatDateTimeJakarta } from "@/lib/format";
import { formatPhoneDisplay } from "@/domain/phone";
import type { AdminOrderListItem } from "@/server/operations/admin/list-orders";

export interface OrdersTableProps {
  orders: AdminOrderListItem[];
  sortField: string;
  sortDirection: "asc" | "desc";
  onSort: (field: string) => void;
}

export function OrdersTable({ orders, sortField, sortDirection, onSort }: OrdersTableProps) {
  const router = useRouter();

  const columns: DataTableColumn<AdminOrderListItem>[] = [
    { key: "order_ref", header: "Referensi", render: (o) => o.order_ref },
    { key: "number", header: "Nomor", render: (o) => formatPhoneDisplay(o.number) },
    { key: "full_name", header: "Nama", sortable: true, render: (o) => o.full_name },
    { key: "university", header: "Universitas", render: (o) => o.university },
    { key: "package_id", header: "Paket", render: (o) => o.package_id },
    {
      key: "status",
      header: "Status",
      render: (o) => <OrderStatusBadge status={o.status as "pending" | "verified" | "rejected"} />,
    },
    {
      key: "submitted_at",
      header: "Diajukan",
      sortable: true,
      render: (o) => formatDateTimeJakarta(new Date(o.submitted_at)),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={orders}
      rowKey={(o) => o.id}
      sortField={sortField}
      sortDirection={sortDirection}
      onSort={onSort}
      onRowClick={(o) => router.push(`/admin/pesanan/${o.id}`)}
      emptyMessage="Tidak ada pesanan yang cocok dengan filter."
    />
  );
}
