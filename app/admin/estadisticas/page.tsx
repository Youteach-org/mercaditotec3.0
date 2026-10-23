"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/useSession";
import { storeApiFetch } from "@/lib/store/client";
import type { SiteAnalytics } from "@/lib/monitoring/siteAnalytics";

const number = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : new Intl.NumberFormat("es-MX").format(value);
const shortDay = (day: string) => {
  const date = new Date(day + "T12:00:00Z");
  return date.toLocaleDateString("es-MX", { day: "2-digit", month: "short", timeZone: "UTC" });
};

function Summary({
  name, value, note,
}: { name: string; value: number | null; note: string }) {
  return (
    <article className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-bold text-stone-700">{name}</h2>
      <p className="mt-2 text-3xl font-black tabular-nums text-stone-950">{number(value)}</p>
      <p className="mt-1 text-xs leading-relaxed text-stone-600">{note}</p>
    </article>
  );
}

export default function EstadisticasPage() {
  const { firebaseUser, loading: sessionLoading } = useSession();
  const [days, setDays] = useState<7 | 30>(7);
  const [snapshot, setSnapshot] = useState<SiteAnalytics | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!firebaseUser) return;
    setBusy(true);
    setError("");
    try {
      const response = await storeApiFetch(firebaseUser, `/api/admin/estadisticas?days=${days}`, {
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No fue posible obtener las estadísticas.");
      setSnapshot(data as SiteAnalytics);
    } catch (caught) {
      setSnapshot(null);
      setError(caught instanceof Error ? caught.message : "No fue posible obtener las estadísticas.");
    } finally {
      setBusy(false);
    }
  }, [firebaseUser, days]);

  useEffect(() => {
    if (!sessionLoading && firebaseUser) void refresh();
  }, [sessionLoading, firebaseUser, refresh]);

  const ready = !busy && snapshot?.status === "available";
  const maxViews = Math.max(1, ...(snapshot?.daily.map((day) => day.pageViews) ?? [1]));
  const maxPaths = Math.max(1, ...(snapshot?.topPages.map((entry) => entry.requestsEstimate) ?? [1]));

  return (
    <main className="min-h-screen bg-[#fff9ee] px-4 py-6 text-stone-950 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <Link href="/admin" className="inline-block text-sm font-bold text-stone-700 hover:underline">
          ← Centro de administración
        </Link>

        <header className="rounded-3xl bg-stone-950 px-5 py-6 text-white shadow-lg sm:p-8">
          <p className="text-sm font-bold tracking-wider text-amber-300">MERCADITOTEC</p>
          <h1 className="mt-1 text-3xl font-black sm:text-4xl">Estadísticas de visitas</h1>
          <p className="mt-2 max-w-3xl text-sm text-stone-200">
            Actividad real del sitio, consultada desde aquí. Las estadísticas de servidor no dependen
            del script de rastreo que Brave bloqueó. Los datos se guardan en caché durante 30 minutos
            por instancia del servidor; no hay consultas automáticas mientras navegan tus visitantes.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl bg-white/15 p-1" role="group" aria-label="Periodo de estadísticas">
              {([7, 30] as const).map((period) => (
                <button key={period} type="button" onClick={() => setDays(period)}
                  aria-pressed={days === period}
                  className={`rounded-lg px-4 py-2 text-sm font-bold transition ${days === period ? "bg-amber-300 text-stone-950" : "text-white hover:bg-white/10"}`}>
                  {period} días
                </button>
              ))}
            </div>
            <button type="button" onClick={() => void refresh()} disabled={busy || !firebaseUser}
              className="rounded-xl border border-amber-200 px-4 py-2.5 text-sm font-bold text-amber-100 disabled:opacity-50">
              {busy ? "Consultando…" : "Actualizar"}
            </button>
            {snapshot && <span className="text-xs text-stone-300">
              Última actualización: {new Date(snapshot.checkedAt).toLocaleString("es-MX")}
            </span>}
          </div>
        </header>

        {error && <div role="alert" className="rounded-2xl border border-red-200 bg-white p-5 text-sm font-semibold text-red-800">{error}</div>}
        {!busy && snapshot?.status === "unavailable" && (
          <section role="status" className="rounded-2xl border border-amber-300 bg-white p-5">
            <h2 className="font-black">Las estadísticas necesitan acceso de lectura</h2>
            <p className="mt-2 text-sm text-stone-700">{snapshot.reason ?? "No hay métricas disponibles."}</p>
            <p className="mt-2 text-sm text-stone-600">
              La página ya está integrada. Falta habilitar el token de Analytics en el Worker, sin
              compartirlo con el navegador ni activar un plan de pago.
            </p>
          </section>
        )}

        <section className="grid gap-3 sm:grid-cols-3" aria-label="Resumen de tráfico">
          <Summary name="Páginas vistas" value={ready ? snapshot?.pageViews ?? null : null}
            note={`Total del periodo de ${days} días según Cloudflare.`} />
          <Summary name="Peticiones al sitio" value={ready ? snapshot?.requests ?? null : null}
            note="Incluye recursos, tráfico automático y solicitudes a la web. No equivale a visitas." />
          <Summary name="IPs distintas hoy" value={ready ? snapshot?.uniqueIpsToday ?? null : null}
            note="Estimación de direcciones IP, no de personas ni de usuarios registrados." />
        </section>

        <section className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm" aria-labelledby="history-title">
          <h2 id="history-title" className="text-xl font-black">Páginas vistas por día</h2>
          <p className="mt-1 text-sm text-stone-600">Historial diario (fechas en UTC). Solo mostramos números obtenidos del servidor.</p>
          {ready && snapshot && (
            <div className="mt-6 overflow-x-auto pb-2">
              <div className={`flex h-56 items-end gap-1 sm:gap-2 ${days === 30 ? "min-w-[750px]" : ""}`}
                role="img" aria-label="Gráfica de páginas vistas diariamente">
                {snapshot.daily.map((item, index) => (
                  <div key={item.day} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                    <span className="text-[10px] font-bold tabular-nums text-stone-700" title={number(item.pageViews)}>
                      {item.pageViews > 0 ? number(item.pageViews) : ""}
                    </span>
                    <div title={`${item.day}: ${number(item.pageViews)} páginas vistas; ${number(item.uniqueIps)} IPs distintas`}
                      className="w-full max-w-12 rounded-t-md bg-amber-500"
                      style={{ height: `${Math.max(2, Math.round(item.pageViews / maxViews * 165))}px` }}/>
                    {(days === 7 || index % 5 === 0 || index === days - 1) && (
                      <span className="whitespace-nowrap text-[10px] text-stone-600">{shortDay(item.day)}</span>
                    )}
                    {days === 30 && index % 5 !== 0 && index !== days - 1 && <span className="h-[15px]" />}
                  </div>
                ))}
              </div>
            </div>
          )}
          {!ready && <p className="mt-5 rounded-lg bg-stone-50 p-6 text-sm text-stone-500">Los valores aparecerán cuando haya datos disponibles.</p>}
        </section>

        <section className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm" aria-labelledby="routes-title">
          <h2 id="routes-title" className="text-xl font-black">Qué páginas consultan más</h2>
          <p className="mt-1 text-sm text-stone-600">
            Rutas de MercaditoTec más solicitadas, según muestras HTTP de Cloudflare. Los valores son
            estimaciones de peticiones, no visitas verificadas de personas.
          </p>
          {ready && snapshot && snapshot.topPages.length > 0 ? (
            <div className="mt-4 space-y-4">
              {snapshot.topPages.map((item, index) => (
                <div key={item.path} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 break-all font-semibold text-stone-900">
                      <span className="mr-2 text-stone-400">{index + 1}.</span>{item.path}
                    </span>
                    <strong className="shrink-0 tabular-nums">{number(item.requestsEstimate)}</strong>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                    <div className="h-full rounded-full bg-emerald-600"
                      style={{ width: `${Math.min(100, item.requestsEstimate / maxPaths * 100)}%` }}/>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-stone-600">
              {ready ? snapshot?.topPagesReason ?? "Aún no hay rutas para este periodo." : "Sin datos de páginas consultadas."}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-amber-100 bg-white p-5">
          <h2 className="text-lg font-black">Usuarios y actividad comercial</h2>
          <p className="mt-2 text-sm text-stone-700">
            Estas métricas generales no permiten saber qué cuenta visitó cada producto. Identificar usuarios
            registrados más activos, productos consultados y clics por tienda requerirá instrumentar eventos
            internos específicos y actualizar el aviso de privacidad. No se mostrará información inventada.
          </p>
          <Link href="/admin/usage" className="mt-3 inline-block text-sm font-bold text-emerald-800 underline">
            Ver consumo técnico y rendimiento →
          </Link>
        </section>

        <p className="pb-3 text-xs text-stone-600">
          Fuentes: analítica HTTP de Cloudflare consultada exclusivamente desde el servidor.
          El acceso requiere permisos administrativos. Las estadísticas pueden tener retraso y
          no son equivalentes a usuarios conectados en tiempo real.
        </p>
      </div>
    </main>
  );
}
