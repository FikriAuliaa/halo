"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminRole } from "@/schemas/admin";

export interface AdminShellProps {
  role: AdminRole;
  email: string;
  children: ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
  requiresRole?: AdminRole;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/pesanan", label: "Orders", icon: "shopping_cart" },
  { href: "/admin/nomor", label: "Numbers", icon: "format_list_numbered" },
  { href: "/admin/konfigurasi", label: "Configuration", icon: "settings" },
  { href: "/admin/diagnostics", label: "Diagnostics", icon: "analytics" },
];

export function AdminShell({ role, email, children }: AdminShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    window.location.href = "/admin/login";
  }

  function getUserInitials(emailStr: string): string {
    const name = emailStr.split("@")[0] ?? "AD";
    const parts = name.split(/[\._\-]/);
    const p0 = parts[0];
    const p1 = parts[1];
    if (p0 && p1 && p0[0] && p1[0]) {
      return (p0[0] + p1[0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.requiresRole || item.requiresRole === role,
  );

  const currentPageTitle =
    NAV_ITEMS.find(
      (item) =>
        pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href)),
    )?.label ?? "Admin Portal";

  return (
    <div className="font-body-lg flex min-h-screen flex-col bg-[#000000] bg-[linear-gradient(180deg,#200e0d_0%,#000000_100%)] bg-fixed text-on-surface antialiased md:flex-row">
      {/* TopNavBar (Mobile) */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-outline-variant/30 bg-surface/80 px-container-margin py-md backdrop-blur-md md:hidden">
        <div className="flex items-center gap-sm">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center justify-center p-xs text-on-surface"
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined">{mobileMenuOpen ? "close" : "menu"}</span>
          </button>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
            {currentPageTitle}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="font-label-bold text-label-bold uppercase tracking-wider text-primary"
        >
          Keluar
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-[60px] z-40 flex flex-col justify-between bg-black/80 p-md backdrop-blur-sm md:hidden">
          <ul className="flex flex-col gap-sm">
            {visibleNavItems.map((item) => {
              const isCurrent =
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(`${item.href}`));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-sm rounded-lg px-md py-sm transition-colors ${
                      isCurrent
                        ? "bg-primary-container font-bold text-on-primary-container shadow-[0_0_15px_rgba(237,2,38,0.3)]"
                        : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
                    }`}
                  >
                    <span className="material-symbols-outlined">{item.icon}</span>
                    <span className="font-body-lg text-body-lg">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between border-t border-outline-variant/30 pt-md">
            <span className="max-w-[200px] truncate text-body-sm text-on-surface-variant">
              {email}
            </span>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="font-label-bold text-label-bold uppercase text-primary"
            >
              Keluar
            </button>
          </div>
        </div>
      )}

      {/* SideNavBar (Desktop) */}
      <nav className="from-surface-variant fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-outline-variant bg-background bg-gradient-to-b to-background p-md shadow-xl md:flex">
        <div className="mb-xl px-sm">
          <h1 className="font-display-lg text-display-lg leading-tight text-primary">
            Halo Kampus
          </h1>
          <p className="font-body-sm mt-1 text-body-sm text-on-surface-variant">Admin Portal</p>
        </div>

        <ul className="flex flex-1 flex-col gap-xs">
          {visibleNavItems.map((item) => {
            const isCurrent =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(`${item.href}`));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-sm rounded-lg px-sm py-sm transition-colors duration-150 active:scale-95 ${
                    isCurrent
                      ? "bg-primary-container font-bold text-on-primary-container shadow-[0_0_15px_rgba(237,2,38,0.3)]"
                      : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
                  }`}
                >
                  <span
                    className="material-symbols-outlined"
                    style={isCurrent ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {item.icon}
                  </span>
                  <span className="font-body-lg text-body-lg">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto flex items-center gap-sm border-t border-outline-variant/30 px-sm pt-lg">
          <div className="bg-surface-variant flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-outline">
            <span className="font-label-bold text-label-bold">{getUserInitials(email)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-body-sm truncate text-body-sm text-on-surface" title={email}>
              {email}
            </p>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="font-label-bold block text-left text-label-bold text-primary hover:underline"
            >
              Keluar
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="mx-auto flex w-full min-w-0 max-w-7xl flex-1 flex-col gap-lg p-container-margin pb-24 md:ml-64 md:p-xl md:pb-xl">
        {children}
      </main>

      {/* BottomNavBar (Mobile) */}
      <nav className="pb-safe fixed bottom-0 left-0 z-50 flex h-20 w-full items-center justify-around border-t border-outline-variant/30 bg-surface/95 px-sm backdrop-blur-md md:hidden">
        {visibleNavItems.map((item) => {
          const isCurrent =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(`${item.href}`));
          if (isCurrent) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center gap-1 text-on-primary-container"
              >
                <div className="absolute inset-0 scale-150 rounded-full bg-primary-container/20 blur-sm"></div>
                <div className="relative z-10 rounded-full bg-primary-container p-1 shadow-[0_0_10px_rgba(237,2,38,0.5)]">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {item.icon === "format_list_numbered" ? "call" : item.icon}
                  </span>
                </div>
                <span className="font-label-bold mt-1 text-[10px] text-label-bold text-primary-container">
                  {item.label}
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined">
                {item.icon === "format_list_numbered" ? "call" : item.icon}
              </span>
              <span className="font-label-bold text-[10px] text-label-bold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
