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
  const marketplaceHome = pathname === "/marketplace";

  return (
    <div className="min-h-screen flex flex-col">
      {!loading && firebaseUser && (
        <header className={marketplaceHome
          ? "sticky top-0 z-50 bg-[#fffaf0]/95 shadow-[0_8px_28px_rgba(17,34,75,0.08)] backdrop-blur"
          : "sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur"
        }>
          <div className="mx-auto w-full max-w-7xl px-3 sm:px-6">
            <div className="flex min-h-14 items-center justify-between gap-3">
              <Link href="/marketplace" className={marketplaceHome
                ? "shrink-0 text-xl font-black tracking-[-0.04em] sm:text-2xl"
                : "shrink-0 font-black tracking-tight text-slate-950"
              }>
                {marketplaceHome ? (
                  <span><span className="text-[#12336d]">Mercadito</span><span className="text-[#ef5a36]">Tec</span></span>
                ) : "MercaditoTec"}
              </Link>

              <nav className="hidden min-w-0 items-center gap-1 md:flex" aria-label="Navegación principal">
                {NAV_ITEMS.map((item) => {
                  const active = isCurrentPath(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={
                        marketplaceHome
                          ? active
                            ? "relative px-3 py-2 text-sm font-black text-[#12336d] after:absolute after:inset-x-2 after:-bottom-0.5 after:h-1 after:rounded-full after:bg-[#ef5a36]"
                            : "rounded-full px-3 py-2 text-sm font-bold text-[#344365] hover:bg-[#fff1d8] hover:text-[#12336d]"
                          : active
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
                      marketplaceHome
                        ? pathname.startsWith("/admin")
                          ? "relative px-3 py-2 text-sm font-black text-[#12336d] after:absolute after:inset-x-2 after:-bottom-0.5 after:h-1 after:rounded-full after:bg-[#ef5a36]"
                          : "rounded-full px-3 py-2 text-sm font-bold text-[#344365] hover:bg-[#fff1d8] hover:text-[#12336d]"
                        : pathname.startsWith("/admin")
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
                className={marketplaceHome
                  ? "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff1d8] text-xl text-[#12336d] hover:bg-[#ffe3af]"
                  : "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xl shadow-sm hover:bg-slate-50"
                }
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
              className={marketplaceHome
                ? "-mx-3 flex gap-1 overflow-x-auto px-3 pb-2 pt-1 md:hidden"
                : "-mx-3 flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 md:hidden"
              }
              aria-label="Navegación principal móvil"
            >
              {NAV_ITEMS.map((item) => {
                const active = isCurrentPath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      marketplaceHome
                        ? active
                          ? "shrink-0 rounded-full bg-[#12336d] px-3 py-2 text-xs font-black text-white"
                          : "shrink-0 rounded-full bg-[#fff1d8] px-3 py-2 text-xs font-bold text-[#344365]"
                        : active
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
                    marketplaceHome
                      ? pathname.startsWith("/admin")
                        ? "shrink-0 rounded-full bg-[#12336d] px-3 py-2 text-xs font-black text-white"
                        : "shrink-0 rounded-full bg-[#fff1d8] px-3 py-2 text-xs font-bold text-[#344365]"
                      : pathname.startsWith("/admin")
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
