"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";
import { getMercaditoHost } from "@/lib/notifications/nativeContainer";

type Platform = "loading" | "android" | "ios" | "browser";

export default function ConfiguracionPage() {
  const router = useRouter();
  const { firebaseUser, loading } = useSession();
  const [platform, setPlatform] = useState<Platform>("loading");
  const [browserCanPush, setBrowserCanPush] = useState(false);
  const [browserPushEnabled, setBrowserPushEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const native = getMercaditoHost();
    setPlatform(native ?? "browser");
    setBrowserCanPush(!native && typeof Notification !== "undefined" &&
      "serviceWorker" in navigator && "PushManager" in window && window.isSecureContext);
  }, []);

  useEffect(() => {
    if (!firebaseUser || !browserCanPush) return;
    setBrowserPushEnabled(
      window.localStorage.getItem(`mercadito-push-${firebaseUser.uid}`) === "enabled" &&
      Notification.permission === "granted"
    );
  }, [firebaseUser, browserCanPush]);

  useEffect(() => {
    if (!loading && !firebaseUser) router.replace("/login");
  }, [firebaseUser, loading, router]);

  async function changeBrowserPush(enable: boolean) {
    if (!firebaseUser || busy || platform !== "browser") return;
    setBusy(true);
    setNotice("");
    try {
      const { enableDevicePush, disableDevicePush } = await import("@/lib/notifications/pushClient");
      if (enable) await enableDevicePush(firebaseUser);
      else await disableDevicePush(firebaseUser);
      window.localStorage.setItem(`mercadito-push-${firebaseUser.uid}`, enable ? "enabled" : "disabled");
      setBrowserPushEnabled(enable);
      setNotice(enable ? "Avisos del navegador activados." : "Avisos del navegador desactivados.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudieron cambiar los avisos.");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !firebaseUser) return (
    <main className="min-h-screen bg-[#fff9ee] p-5" aria-busy="true">Cargando configuración…</main>
  );

  return (
    <main className="min-h-screen bg-[#fff9ee] px-4 pb-14 pt-7 text-[#102f6d] sm:px-6">
      <div className="mx-auto max-w-2xl space-y-5">
        <header className="rounded-3xl bg-[#123d82] px-6 py-7 text-white shadow-lg">
          <p className="text-xs font-black uppercase tracking-widest text-[#ffcf4c]">MercaditoTec</p>
          <h1 className="mt-2 text-3xl font-black">⚙️ Configuración</h1>
          <p className="mt-2 text-sm text-white/85">Avisos, cuenta y opciones de la aplicación.</p>
        </header>

        <section className="rounded-3xl border border-[#f2d9a9] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-black">🔔 Notificaciones</h2>
          <p className="mt-2 text-sm text-slate-700">Tus pedidos, mensajes, movimientos de tiendas y avisos administrativos se registran en MercaditoTec.</p>
          <Link href="/notifications" className="mt-4 inline-flex rounded-xl bg-[#ffd54c] px-4 py-3 font-black text-[#123d82]">
            Abrir centro de notificaciones
          </Link>

          <div className="mt-5 border-t border-[#f2d9a9] pt-4">
            <h3 className="font-black">Avisos incluso cuando esté cerrada</h3>
            {platform === "android" || platform === "ios" ? (
              <div>
                <p className="mt-2 text-sm text-slate-700">
                  La app instalada ya muestra avisos dentro de MercaditoTec, pero las alertas del teléfono con la aplicación cerrada todavía no están habilitadas. Falta conectar Firebase Messaging al cliente de {platform === "android" ? "Android" : "iPhone"}.
                </p>
                <p className="mt-2 text-sm font-semibold">Por ahora, consulta la campana 🔔 para ver tus avisos.</p>
              </div>
            ) : platform === "browser" && browserCanPush ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-slate-700">
                  <p>{browserPushEnabled ? "Avisos de este navegador activados." : "Puedes habilitar avisos de este navegador."}</p>
                  <p className="mt-1 text-xs text-slate-500">También debes permitirlos en los ajustes del navegador y el teléfono.</p>
                </div>
                <button type="button" disabled={busy} onClick={() => void changeBrowserPush(!browserPushEnabled)}
                  className="rounded-xl bg-[#174db4] px-4 py-3 font-black text-white disabled:opacity-60">
                  {busy ? "Configurando…" : browserPushEnabled ? "Desactivar avisos" : "Activar avisos"}
                </button>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-700">Este navegador no admite avisos push. Las notificaciones internas continúan disponibles.</p>
            )}
            {notice && <p role="status" className="mt-3 text-sm font-bold">{notice}</p>}
          </div>
        </section>

        <section className="rounded-3xl border border-[#f2d9a9] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-black">👤 Cuenta y privacidad</h2>
          <nav className="mt-4 grid gap-3" aria-label="Cuenta y privacidad">
            <Link href="/profile" className="rounded-2xl border border-[#f2d9a9] px-4 py-3 font-bold hover:bg-[#fff9ee]">Perfil, datos y contraseña →</Link>
            <Link href="/terms" className="rounded-2xl border border-[#f2d9a9] px-4 py-3 font-bold hover:bg-[#fff9ee]">Condiciones de uso →</Link>
          </nav>
        </section>

        <section className="rounded-3xl border border-[#f2d9a9] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-black">📱 Aplicación</h2>
          <p className="mt-2 text-sm text-slate-700">
            Los cambios publicados de la web llegan a MercaditoTec al recargar. Las funciones nativas del teléfono requieren instalar una actualización de la aplicación.
          </p>
          <button type="button" onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-[#f15b32] px-4 py-3 font-black text-white">
            Recargar MercaditoTec
          </button>
          {(platform === "android" || platform === "ios") && (
            <p className="mt-3 text-xs text-slate-500">
              Para consultar permisos, abre los Ajustes de {platform === "ios" ? "iPhone" : "Android"} → Aplicaciones → MercaditoTec.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
