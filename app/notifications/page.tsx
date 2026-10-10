"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  announceNotificationsChanged,
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationApiRecord,
} from "@/lib/notifications/client";
import { useSession } from "@/lib/useSession";

function typeIcon(type: NotificationApiRecord["type"]): string {
  switch (type) {
    case "order_created": return "🧾";
    case "order_accepted": return "✅";
    case "order_rejected": return "❌";
    case "order_ready": return "📦";
    case "order_completed": return "🎉";
    case "order_cancelled": return "↩️";
    case "store_pending_review": return "🏪";
    case "store_changes_required": return "🛠️";
    case "store_approved": return "✅";
    case "store_suspended": return "⛔";
    case "store_reactivated": return "✅";
    case "student_pending": return "👤";
    case "direct_message": return "💬";
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const { firebaseUser, loading: sessionLoading } = useSession();
  const [notifications, setNotifications] = useState<NotificationApiRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);

  const refresh = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    setError("");
    try {
      const result = await loadNotifications(firebaseUser);
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las notificaciones.");
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!firebaseUser) {
      router.replace("/login");
      return;
    }
    void refresh();
  }, [firebaseUser, refresh, router, sessionLoading]);

  async function openNotification(notification: NotificationApiRecord) {
    if (!firebaseUser || busyId) return;
    setBusyId(notification.id);
    setError("");
    try {
      if (!notification.readAt) {
        await markNotificationRead(firebaseUser, notification.id);
        announceNotificationsChanged();
      }
      router.push(notification.href);
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : "No se pudo abrir la notificación.");
      setBusyId(null);
    }
  }

  async function readAll() {
    if (!firebaseUser || markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    setError("");
    try {
      await markAllNotificationsRead(firebaseUser);
      const now = new Date().toISOString();
      setNotifications((current) => current.map((item) => item.readAt ? item : { ...item, readAt: now }));
      setUnreadCount(0);
      announceNotificationsChanged();
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : "No se pudieron marcar las notificaciones.");
    } finally {
      setMarkingAll(false);
    }
  }

  async function changeDeviceNotifications(enable: boolean) {
    if (!firebaseUser || pushBusy) return;
    setPushBusy(true);
    setPushMessage("");
    try {
      const { enableDevicePush, disableDevicePush } = await import("@/lib/notifications/pushClient");
      if (enable) await enableDevicePush(firebaseUser);
      else await disableDevicePush(firebaseUser);
      setPushEnabled(enable);
      setPushMessage(enable
        ? "Notificaciones de Android activadas en este dispositivo."
        : "Notificaciones de este dispositivo desactivadas.");
    } catch (error) {
      setPushMessage(error instanceof Error ? error.message : "No se pudieron configurar las notificaciones.");
    } finally {
      setPushBusy(false);
    }
  }

  if (sessionLoading || !firebaseUser) {
    return <main className="min-h-screen bg-slate-100 p-5">Comprobando sesión...</main>;
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 sm:px-6 sm:py-7">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="rounded-3xl bg-slate-950 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-300">Mercadito Tec 3</p>
              <h1 className="mt-2 text-3xl font-black">Notificaciones</h1>
              <p className="mt-2 text-sm text-slate-300">
                {unreadCount > 0 ? `${unreadCount} sin leer` : "No tienes notificaciones pendientes."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void readAll()}
                  disabled={markingAll}
                  className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-50"
                >
                  {markingAll ? "Marcando..." : "Marcar todas como leídas"}
                </button>
              )}
              <Link href="/marketplace" className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-950">
                Marketplace
              </Link>
            </div>
          </div>
        </header>

        <section className="rounded-2xl bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-slate-900">Avisos en esta tablet o celular</h2>
              <p className="text-sm text-slate-600">Recibe avisos de revisiones, mensajes y pedidos, incluso con Mercadito cerrado.</p>
            </div>
            <button type="button" disabled={pushBusy}
              onClick={() => void changeDeviceNotifications(!pushEnabled)}
              className="rounded-xl bg-[#174db4] px-4 py-2.5 text-sm font-black text-white disabled:opacity-60">
              {pushBusy ? "Configurando..." : pushEnabled ? "Desactivar avisos" : "Activar avisos"}
            </button>
          </div>
          {pushMessage && <p role="status" className="mt-2 text-sm font-semibold text-slate-700">{pushMessage}</p>}
        </section>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">{error}</div>
        )}

        {loading ? (
          <section className="rounded-3xl bg-white p-6 text-slate-600 shadow-sm">Cargando notificaciones...</section>
        ) : notifications.length === 0 ? (
          <section className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <div className="text-4xl" aria-hidden="true">🔔</div>
            <h2 className="mt-3 text-xl font-black text-slate-900">Todavía no hay notificaciones</h2>
            <p className="mt-2 text-sm text-slate-600">Aquí aparecerán los cambios importantes de tus pedidos y solicitudes.</p>
          </section>
        ) : (
          <section className="space-y-3">
            {notifications.map((notification) => {
              const unread = !notification.readAt;
              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => void openNotification(notification)}
                  disabled={busyId === notification.id}
                  className={`w-full rounded-3xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60 ${
                    unread ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm" aria-hidden="true">
                      {typeIcon(notification.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h2 className="font-black text-slate-950">{notification.title}</h2>
                        {unread && (
                          <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-white">Nueva</span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-700">{notification.message}</p>
                      <p className="mt-3 text-xs font-semibold text-slate-500">
                        {new Date(notification.createdAt).toLocaleString("es-MX")}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
