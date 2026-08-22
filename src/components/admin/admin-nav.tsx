"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminRole } from "@/schemas/admin";

interface NavItem {
  href: string;
  label: string;
  /** `undefined` — visible to both roles. */
  requiresRole?: AdminRole;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/pesanan", label: "Pesanan" },
  { href: "/admin/nomor", label: "Nomor" },
  { href: "/admin/konfigurasi", label: "Konfigurasi" },
  { href: "/admin/diagnostics", label: "Diagnostik" },
];

export interface AdminNavProps {
  role: AdminRole;
  className?: string;
}

/** Real `<nav>`, current-page indicated via `aria-current` (B098) — role-
 * aware items hide as UX only; every underlying operation is enforced
 * server-side regardless (the same `ADMIN_PERMISSIONS` matrix, B096). */
export function AdminNav({ role, className }: AdminNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigasi admin" className={className}>
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.filter((item) => !item.requiresRole || item.requiresRole === role).map(
          (item) => {
            const isCurrent = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isCurrent ? "page" : undefined}
                  className={`block rounded-field px-sm py-sm font-body text-body-lg transition-colors ${
                    isCurrent
                      ? "bg-primary-container text-on-primary-container"
                      : "text-on-surface hover:bg-surface-container-high"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          },
        )}
      </ul>
    </nav>
  );
}
