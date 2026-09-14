"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { loadUnreadNotificationCount } from "@/lib/notifications/client";
import { isAdminRole } from "@/lib/security/domain";
import { useSession } from "@/lib/useSession";

const NAV_ITEMS = [
  { href: "/marketplace", label: "Mercadito" },
  { href: "/orders", label: "Pedidos" },
  { href: "/mystore", label: "Mis tiendas" },
  { href: "/chat", label: "Chat" },
  { href: "/profile", label: "Perfil" },
];

function isCurrentPath(pathname: string, href: string): boolean {
  if (href === "/marketplace") {
    return pathname === href || pathname.startsWith("/marketplace/");
  }
  if (href === "/mystore") {
    return pathname === href || pathname.startsWith("/mystore/");
  }
  return pathname === href;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { firebaseUser, appUser, loading } = useSession();
  const [fallbackUnreadCount, setFallbackUnreadCount] = useState(0);

  const profileUnreadCount =
    typeof appUser?.unreadNotificationCount === "number"
      ? Math.max(0, Math.floor(appUser.unreadNotificationCount))
      : null;

  useEffect(() => {
    if (loading || !firebaseUser || profileUnreadCount !== null) return;

    let cancelled = false;

    void loadUnreadNotificationCount(firebaseUser)
      .then((count) => {
        if (!cancelled) setFallbackUnreadCount(count);
      })
      .catch(() => {
        if (!cancelled) setFallbackUnreadCount(0);
      });

    return () => {
      cancelled = true;
    };
  }, [firebaseUser, loading, profileUnreadCount]);

  const unreadCount = profileUnreadCount ?? fallbackUnreadCount;
  const showAdmin = isAdminRole(appUser);

  return (
    <div className="min-h-screen flex flex-col">
      {!loading && firebaseUser && (
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
          <div className="mx-auto w-full max-w-7xl px-3 sm:px-6">
            <div className="flex min-h-14 items-center justify-between gap-3">
              <Link href="/marketplace" className="shrink-0 font-black tracking-tight text-slate-950">
                MercaditoTec
              </Link>

              <nav className="hidden min-w-0 items-center gap-1 md:flex" aria-label="Navegación principal">
                {NAV_ITEMS.map((item) => {
                  const active = isCurrentPath(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={
                        active
                          ? "rounded-xl bg-slate-900 px-3 py-2 text-sm font-black text-white"
                          : "rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                      }
                    >
                      {item.label}
                    </Link>
                  );
                })}
                {showAdmin && (
                  <Link
                    href="/admin"
                    className={
                      pathname.startsWith("/admin")
                        ? "rounded-xl bg-slate-900 px-3 py-2 text-sm font-black text-white"
                        : "rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                    }
                  >
                    Admin
                  </Link>
                )}
              </nav>

              <Link
                href="/notifications"
                aria-label={unreadCount > 0 ? `${unreadCount} notificaciones sin leer` : "Notificaciones"}
                className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xl shadow-sm hover:bg-slate-50"
              >
                <span aria-hidden="true">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-black leading-none text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            </div>

            <nav
              className="-mx-3 flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 md:hidden"
              aria-label="Navegación principal móvil"
            >
              {NAV_ITEMS.map((item) => {
                const active = isCurrentPath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      active
                        ? "shrink-0 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white"
                        : "shrink-0 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
              {showAdmin && (
                <Link
                  href="/admin"
                  className={
                    pathname.startsWith("/admin")
                      ? "shrink-0 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white"
                      : "shrink-0 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
                  }
                >
                  Admin
                </Link>
              )}
            </nav>
          </div>
        </header>
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
}
