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
  { href: "/cosas-perdidas", label: "Cosas perdidas", icon: "lost" },
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
  if (icon === "lost") {
    return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.5" /><path d="m14.5 14.5 5 5M8.5 8.2a2.4 2.4 0 0 1 4.4 1.3c0 1.8-2.4 2-2.4 3.5M10.5 16h.01" /></svg>;
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
  const adminSurface = pathname.startsWith("/admin");
  const scrapbookShell = true;
  const showShell = !loading && (marketplaceHome || Boolean(firebaseUser) || visualPreview);

  return (
    <div className={scrapbookShell ? `mercadito-app-shell ${adminSurface ? "mercadito-admin-shell" : ""} min-h-screen flex flex-col` : "min-h-screen flex flex-col"} data-mercadito-skin={scrapbookShell ? "true" : "false"} data-admin-surface={adminSurface ? "true" : "false"}>
      {showShell && (
        <header className={scrapbookShell
          ? "mkt-shell-header mercadito-global-header sticky top-0 z-50 bg-[#fffaf0]/98"
          : "sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur"
        }>
          <div className={scrapbookShell ? "mkt-shell-header-inner mx-auto w-full max-w-[1448px] px-5 sm:px-10 lg:px-[60px]" : "mx-auto w-full max-w-7xl px-3 sm:px-6"}>
            <div className={scrapbookShell ? "flex min-h-[70px] items-center gap-3" : "flex min-h-14 items-center justify-between gap-3"}>
              <Link href="/marketplace" className={scrapbookShell
                ? "w-auto max-w-[270px] shrink-0 leading-none sm:w-[300px]"
                : "shrink-0 font-black tracking-tight text-slate-950"
              }>
                {scrapbookShell ? (
                  <span className="block">
                    <span className="block text-[31px] font-black tracking-[-0.06em]">
                      <span className="text-[#123d82]">Mercadito</span><span className="text-[#f15b32]">Tec</span>
                    </span>
                    <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.19em] text-[#123d82]">
                      de estudiantes · para estudiantes
                    </span>
                    <svg className="absolute ml-[270px] -mt-[48px] h-9 w-9 rotate-[-10deg] text-[#f3a500]" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" aria-hidden="true">
                      <path d="M7 10 12 2M19 13 20 3M28 17 36 11" />
                    </svg>
                  </span>
                ) : "MercaditoTec"}
              </Link>

              <nav className={scrapbookShell ? "ml-auto hidden min-w-0 items-center gap-1 md:flex" : "hidden min-w-0 items-center gap-1 md:flex"} aria-label="Navegación principal">
                {firebaseUser ? (
                  <>
                    {NAV_ITEMS.map((item) => {
                      const active = isCurrentPath(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={
                            scrapbookShell
                              ? active
                                ? "relative flex items-center gap-2 px-3 py-2 text-sm font-black text-[#174db4] after:absolute after:inset-x-2 after:-bottom-1 after:h-1 after:rounded-full after:bg-[#f15b32]"
                                : "relative flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-[#102f6d] hover:bg-[#fff0cf]"
                              : active
                                ? "rounded-xl bg-slate-900 px-3 py-2 text-sm font-black text-white"
                                : "rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                          }
                        >
                          {scrapbookShell && <NavIcon icon={item.icon} />}
                          <span>{item.label}</span>
                          {scrapbookShell && item.href === "/chat" && (
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
                            ? scrapbookShell
                              ? "relative flex items-center gap-2 px-3 py-2 text-sm font-black text-[#174db4] after:absolute after:inset-x-2 after:-bottom-1 after:h-1 after:rounded-full after:bg-[#f15b32]"
                              : "rounded-xl bg-slate-900 px-3 py-2 text-sm font-black text-white"
                            : scrapbookShell
                              ? "relative flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-[#102f6d] hover:bg-[#fff0cf]"
                              : "rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                        }
                      >
                        Admin
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className={scrapbookShell
                        ? "rounded-full border-2 border-[#174db4] bg-white px-4 py-2 text-sm font-black text-[#174db4]"
                        : "rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800"
                      }
                    >
                      Iniciar sesión
                    </Link>
                    <Link
                      href="/register"
                      className={scrapbookShell
                        ? "rounded-full bg-[#174db4] px-4 py-2 text-sm font-black text-white"
                        : "rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
                      }
                    >
                      Crear cuenta
                    </Link>
                  </>
                )}
              </nav>

              {!marketplaceHome && (
                <Link
                  href="/notifications"
                  aria-label={unreadCount > 0 ? `${unreadCount} notificaciones sin leer` : "Notificaciones"}
                  className={scrapbookShell ? "mercadito-shell-bell relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#174db4] bg-[#ffd54c] text-xl shadow-sm" : "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xl shadow-sm hover:bg-slate-50"}
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
              className={scrapbookShell
                ? "-mx-3 flex gap-2 overflow-x-auto px-3 pb-2 pt-0 md:hidden"
                : "-mx-3 flex gap-2 overflow-x-auto border-t border-slate-100 px-3 py-2 md:hidden"
              }
              aria-label="Navegación principal móvil"
            >
              {firebaseUser ? (
                <>
                  {NAV_ITEMS.map((item) => {
                    const active = isCurrentPath(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={
                          scrapbookShell
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
                          ? scrapbookShell
                            ? "shrink-0 rounded-full bg-[#174db4] px-3 py-2 text-xs font-black text-white"
                            : "shrink-0 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white"
                          : scrapbookShell
                            ? "shrink-0 rounded-full bg-[#fff0cf] px-3 py-2 text-xs font-bold text-[#102f6d]"
                            : "shrink-0 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
                      }
                    >
                      Admin
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link
                    href="/marketplace"
                    className="shrink-0 rounded-full bg-[#fff0cf] px-3 py-2 text-xs font-bold text-[#102f6d]"
                  >
                    Mercadito
                  </Link>
                  <Link
                    href="/login"
                    className="shrink-0 rounded-full border-2 border-[#174db4] bg-white px-3 py-2 text-xs font-black text-[#174db4]"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/register"
                    className="shrink-0 rounded-full bg-[#174db4] px-3 py-2 text-xs font-black text-white"
                  >
                    Crear cuenta
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
      )}
      <div className={scrapbookShell ? "mercadito-app-content flex-1" : "flex-1"}>{children}</div>
    </div>
  );
}
