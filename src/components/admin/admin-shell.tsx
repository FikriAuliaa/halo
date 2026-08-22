"use client";

import { useState, type ReactNode } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { AdminNav } from "./admin-nav";
import { Button } from "@/components/ui/button";
import type { AdminRole } from "@/schemas/admin";

export interface AdminShellProps {
  role: AdminRole;
  email: string;
  children: ReactNode;
  breadcrumbs?: ReactNode;
}

const ROLE_LABELS: Record<AdminRole, string> = {
  ADMIN_KAMPUS: "Admin Kampus",
  ADMIN_TELKOMSEL: "Admin Telkomsel",
};

/**
 * The admin shell (B098) — same tokens/typography as the student
 * interface, denser layout. Sidebar at >=1024px, a Radix Dialog-based
 * drawer below that (focus-trapped and Escape-closing for free, rather
 * than hand-rolling that behavior).
 */
export function AdminShell({ role, email, children, breadcrumbs }: AdminShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    window.location.href = "/admin/login";
  }

  return (
    <div className="flex min-h-screen w-full bg-surface-container-lowest">
      <aside className="hidden w-64 shrink-0 border-r border-outline-variant bg-surface-container p-md lg:block">
        <div className="mb-lg font-display text-title-md text-on-surface">Halo Admin</div>
        <AdminNav role={role} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-outline-variant bg-surface-container px-md py-sm">
          <div className="flex items-center gap-sm">
            <RadixDialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
              <RadixDialog.Trigger asChild>
                <button
                  type="button"
                  aria-label="Buka menu navigasi"
                  className="rounded-field p-2 lg:hidden"
                >
                  <span aria-hidden="true" className="material-symbols-outlined">
                    menu
                  </span>
                </button>
              </RadixDialog.Trigger>
              <RadixDialog.Portal>
                <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
                <RadixDialog.Content className="fixed inset-y-0 left-0 z-50 w-64 bg-surface-container p-md">
                  <RadixDialog.Title className="mb-lg font-display text-title-md text-on-surface">
                    Halo Admin
                  </RadixDialog.Title>
                  <AdminNav role={role} />
                </RadixDialog.Content>
              </RadixDialog.Portal>
            </RadixDialog.Root>
            {breadcrumbs}
          </div>

          <div className="flex items-center gap-sm">
            <div className="text-right">
              <div className="font-body text-body-sm text-on-surface">{email}</div>
              <div className="font-body text-body-sm text-on-surface-variant">
                {ROLE_LABELS[role]}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => void handleLogout()}>
              Keluar
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-md">{children}</main>
      </div>
    </div>
  );
}
