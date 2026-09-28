"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { loadUnreadNotificationCount } from "@/lib/notifications/client";
import { isAdminRole } from "@/lib/security/domain";
import { useSession } from "@/lib/useSession";

const NAV_ITEMS = [
  { href: "/marketplace", label: "Mercadito", icon: "home" },
  { href: "/orders", label: "Pedidos", icon: "bag" },
  { href: "/mystore", label: "Mis tiendas", icon: "store" },
  { href: "/chat", label: "Chat", icon: "chat" },
  { href: "/profile", label: "Perfil", icon: "profile" },
];

function NavIcon({ icon }: { icon: string }) {
  const common = "h-5 w-5";

  if (icon === "home") {
    return <svg viewBox="0 0 24 24" className={common} fill="currentColor" aria-hidden="true"><path d="M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5H15v-6H9v6H3.5a.5.5 0 0 1-.5-.5v-9.7Z" /></svg>;
  }
  if (icon === "bag") {
    return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><path d="M5 8h14l-1 13H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>;
  }
  if (icon === "store") {
    return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><path d="M4 9h16l-1.5-5h-13L4 9Z" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></svg>;
  }
  if (icon === "chat") {
    return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-9 8.5 9 9 0 0 1-4-.9L3 21l1.8-4.3A8.5 8.5 0 1 1 21 11.5Z" /></svg>;
  }
  return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><circle cx="12" cy="7" r="3.2" /><path d="M5.5 21c.6-5 2.9-7.5 6.5-7.5s5.9 2.5 6.5 7.5" /></svg>;
}

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
  const [visualPreview, setVisualPreview] = useState(false);

  useEffect(() => {
    if (pathname !== "/marketplace") {
      setVisualPreview(false);
      return;
    }
    setVisualPreview(new URLSearchParams(window.location.search).get("visual") === "1");
  }, [pathname]);

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
      {!loading && (firebaseUser || visualPreview) && (
        <header className={marketplaceHome
          ? "sticky top-0 z-50 bg-[#fffaf0]/98 shadow-[0_2px_10px_rgba(16,47,108,0.05)] backdrop-blur"
          : "sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur"
        }>
          <div className={marketplaceHome ? "mx-auto w-full max-w-[1448px] px-5 sm:px-10 lg:px-[60px]" : "mx-auto w-full max-w-7xl px-3 sm:px-6"}>
            <div className={marketplaceHome ? "flex min-h-[70px] items-center justify-between gap-3" : "flex min-h-14 items-center justify-between gap-3"}>
              <Link href="/marketplace" className={marketplaceHome
                ? "shrink-0 leading-none"
                : "shrink-0 font-black tracking-tight text-slate-950"
              }>
                {marketplaceHome ? (
                  <span className="block">
                    <span className="block text-[31px] font-black tracking-[-0.06em]">
                      <span className="text-[#123d82]">Mercadito</span><span className="text-[#f15b32]">Tec</span>
                    </span>
                    <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.19em] text-[#123d82]">
                      de estudiantes · para estudiantes
                    </span>
                    <span className="absolute ml-[268px] -mt-[44px] rotate-[-18deg] text-[25px] font-black tracking-[-8px] text-[#f3a500]" aria-hidden="true">///</span>
                  </span>
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
                            ? "relative flex items-center gap-2 px-3 py-2 text-sm font-black text-[#174db4] after:absolute after:inset-x-2 after:-bottom-1 after:h-1 after:rounded-full after:bg-[#f15b32]"
                            : "relative flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-[#102f6d] hover:bg-[#fff0cf]"
                          : active
                            ? "rounded-xl bg-slate-900 px-3 py-2 text-sm font-black text-white"
                            : "rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                      }
                    >
                      {marketplaceHome && <NavIcon icon={item.icon} />}
                      <span>{item.label}</span>
                      {marketplaceHome && item.href === "/chat" && (
                        <span className="absolute right-0 top-1 h-2.5 w-2.5 rounded-full bg-[#f15b32]" aria-hidden="true" />
                      )}
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

              {!marketplaceHome && (
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
              )}
            </div>

            <nav
              className={marketplaceHome
                ? "-mx-3 flex gap-1 overflow-x-auto px-3 pb-2 pt-0 md:hidden"
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
                          ? "shrink-0 rounded-full bg-[#174db4] px-3 py-2 text-xs font-black text-white"
                          : "shrink-0 rounded-full bg-[#fff0cf] px-3 py-2 text-xs font-bold text-[#102f6d]"
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
