"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { loadUnreadNotificationCount } from "@/lib/notifications/client";
import { useSession } from "@/lib/useSession";

export default function AppShell({ children }: { children: React.ReactNode }) {
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

  return (
    <div className="min-h-screen flex flex-col">
      {!loading && firebaseUser && (
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
          <div className="mx-auto flex min-h-14 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
            <Link href="/marketplace" className="font-black tracking-tight text-slate-950">
              MercaditoTec
            </Link>
            <Link
              href="/notifications"
              aria-label={unreadCount > 0 ? `${unreadCount} notificaciones sin leer` : "Notificaciones"}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-xl shadow-sm hover:bg-slate-50"
            >
              <span aria-hidden="true">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-black leading-none text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
}
