"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { storeApiFetch } from "@/lib/store/client";
import { useSession } from "@/lib/useSession";
import { FREE_QUOTA } from "@/lib/monitoring/domain";
import type { UsageSnapshot, Meter } from "@/lib/monitoring/usage";

const number = (value: number) => new Intl.NumberFormat("es-MX").format(Math.round(value));

function Reading({
  label, item, quota, detail,
}: {
  label: string; item: Meter; quota: number; detail?: string;
}) {
  const ratio = item.value === null ? 0 : Math.min(100, item.value / quota * 100);
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-bold text-slate-700">{label}</h3>
      <p className="mt-2 text-2xl font-black text-slate-950">
        {item.value === null ? "Sin datos" : number(item.value)}
        <span className="ml-2 text-sm font-medium text-slate-500">/ {number(quota)}</span>
      </p>
      {item.value === null ? (
        <p className="mt-2 text-xs text-slate-600">{item.reason ?? "Métrica no disponible."}</p>
      ) : (
        <>
          <div role="meter" aria-label={label} aria-valuenow={Math.min(item.value, quota)}
            aria-valuemin={0} aria-valuemax={quota}
            className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div className={`h-full rounded-full ${ratio >= 80 ? "bg-red-600" : ratio >= 60 ? "bg-amber-500" : "bg-emerald-600"}`}
              style={{ width: `${ratio}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {ratio.toFixed(1)}% del límite de referencia
          </p>
        </>
      )}
      {detail && <p className="mt-2 text-xs text-slate-600">{detail}</p>}
    </article>
  );
}

export default function AdminUsagePage() {
  const { firebaseUser, loading: sessionLoading } = useSession();
  const [snapshot, setSnapshot] = useState<UsageSnapshot | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const update = useCallback(async () => {
    if (!firebaseUser) return;
    setBusy(true);
    setError("");
    try {
      const response = await storeApiFetch(firebaseUser, "/api/admin/usage", {
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Las métricas no están disponibles.");
      setSnapshot(data as UsageSnapshot);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Error al consultar las métricas.");
    } finally {
      setBusy(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (!sessionLoading && firebaseUser) void update();
  }, [sessionLoading, firebaseUser, update]);

  const traffic = snapshot?.traffic;
  const maxMinuteRequests = Math.max(1, ...(traffic?.byMinute.map((point) => point.requests) ?? [1]));

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <Link href="/admin" className="text-sm font-bold text-slate-700 hover:underline">
          ← Administración
        </Link>
        <header className="rounded-3xl bg-slate-950 p-6 text-white">
          <h1 className="text-3xl font-black">Consumo y rendimiento</h1>
          <p className="mt-2 text-sm text-slate-200">
            Datos oficiales de Cloudflare y Firestore. Sin consultas automáticas periódicas ni contadores en Firebase.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void update()} disabled={busy || sessionLoading}
              className="rounded-xl bg-white px-5 py-2.5 font-black text-slate-950 disabled:opacity-60">
              {busy ? "Consultando…" : "Actualizar"}
            </button>
            {snapshot && <span className="text-xs text-slate-300">
              Última consulta: {new Date(snapshot.checkedAt).toLocaleString("es-MX")}
            </span>}
          </div>
        </header>
        {error && <p role="alert" className="rounded-xl bg-white p-4 font-semibold text-red-700">{error}</p>}
        <section className="space-y-3">
          <h2 className="text-xl font-black text-slate-900">Cloudflare Workers</h2>
          <p className="text-sm text-slate-600">Peticiones de este Worker desde las 00:00 UTC. El límite gratuito de 100,000 peticiones diarias corresponde a toda la cuenta, no solo a Mercadito.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Reading label="Peticiones al Worker" item={snapshot?.workers.requests ?? { value: null, reason: "Consulta las métricas." }} quota={FREE_QUOTA.workerRequestsPerDay} />
            <article className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-bold text-slate-700">Errores de ejecución</h3>
              <p className="mt-2 text-2xl font-black text-slate-950">
                {snapshot?.workers.errors.value === null || snapshot?.workers.errors.value === undefined
                  ? "Sin datos" : number(snapshot.workers.errors.value)}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-bold text-slate-700">Subconsultas salientes</h3>
              <p className="mt-2 text-2xl font-black text-slate-950">
                {snapshot?.workers.subrequests.value === null || snapshot?.workers.subrequests.value === undefined
                  ? "Sin datos" : number(snapshot.workers.subrequests.value)}
              </p>
            </article>
          </div>
          <a href="https://dash.cloudflare.com/" target="_blank" rel="noopener noreferrer"
            className="inline-block text-sm font-bold underline text-slate-800">
            Abrir métricas oficiales de Cloudflare ↗
          </a>
        </section>
        <section className="space-y-3" aria-labelledby="traffic-heading">
          <h2 id="traffic-heading" className="text-xl font-black text-slate-900">Actividad reciente de la página</h2>
          <p className="text-sm text-slate-600">
            Actividad observada por Cloudflare en los últimos 15 minutos. No se utiliza
            ninguna consulta de presencia a Firebase ni se envían señales periódicas desde los visitantes.
          </p>
          {traffic?.status === "available" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <article className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-bold text-slate-700">IPs distintas en el último minuto registrado</h3>
                  <p className="mt-2 text-3xl font-black text-slate-950">
                    {traffic.uniqueIpsLatestMinute === null ? "Sin datos" : number(traffic.uniqueIpsLatestMinute)}
                  </p>
                  <p className="mt-2 text-xs text-slate-600">
                    {traffic.latestMinute ? `Minuto registrado: ${new Date(traffic.latestMinute).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}` : ""}
                  </p>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-bold text-slate-700">Peticiones de la zona (15 min)</h3>
                  <p className="mt-2 text-3xl font-black text-slate-950">
                    {traffic.requestsLast15Minutes === null ? "Sin datos" : number(traffic.requestsLast15Minutes)}
                  </p>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-bold text-slate-700">Páginas vistas (15 min)</h3>
                  <p className="mt-2 text-3xl font-black text-slate-950">
                    {traffic.pageViewsLast15Minutes === null ? "Sin datos" : number(traffic.pageViewsLast15Minutes)}
                  </p>
                </article>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="font-black text-slate-900">Peticiones observadas por minuto</h3>
                <div className="mt-4 flex h-28 items-end gap-1" role="img"
                  aria-label="Gráfica de peticiones por minuto de los últimos 15 minutos">
                  {traffic.byMinute.map((point) => (
                    <div key={point.minute} className="flex min-w-0 flex-1 flex-col items-center justify-end"
                      title={`${new Date(point.minute).toLocaleTimeString("es-MX")}: ${point.requests} peticiones, ${point.uniqueIps} IPs distintas`}>
                      <div className="w-full max-w-8 rounded-t-md bg-emerald-600"
                        style={{ height: `${Math.max(2, point.requests / maxMinuteRequests * 100)}px` }} />
                    </div>
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-xs text-slate-500">
                  <span>{traffic.byMinute.length ? new Date(traffic.byMinute[0].minute).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                  <span>{traffic.latestMinute ? new Date(traffic.latestMinute).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                </div>
              </div>
              {traffic.topPaths.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="font-black text-slate-900">Rutas con más tráfico (15 min)</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Peticiones HTTP estimadas. No equivalen a lecturas de Firestore.
                  </p>
                  <div className="mt-3 space-y-2">
                    {traffic.topPaths.map((entry) => (
                      <div key={entry.path} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2 text-sm">
                        <code className="min-w-0 break-all text-slate-800">{entry.path}</code>
                        <span className="shrink-0 font-bold tabular-nums text-slate-900">{number(entry.requests)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="rounded-xl bg-white p-4 text-xs text-slate-700">
                <strong>No son usuarios conectados exactos:</strong> una IP puede representar a muchos alumnos
                detrás de la misma red; los bots pueden influir y una persona puede permanecer leyendo
                sin hacer nuevas peticiones. Las estadísticas también pueden tardar en aparecer.
                No sumes las IPs distintas de cada minuto para calcular personas únicas.
              </p>
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
              <p className="font-black text-slate-900">Visitas recientes: sin datos</p>
              <p className="mt-2 text-slate-600">{traffic?.reason ?? "Pulsa Actualizar para consultar las estadísticas."}</p>
              <p className="mt-2 text-slate-600">
                Para integrarlas, Cloudflare requiere un token con acceso de lectura de Analytics
                y permiso de consulta de zona. No afecta Firebase ni habilita un plan de pago.
              </p>
            </div>
          )}
          <a href="https://dash.cloudflare.com/" target="_blank" rel="noopener noreferrer"
            className="inline-block text-sm font-bold underline text-slate-800">
            Abrir Cloudflare Analytics para comparar visitas ↗
          </a>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-black text-slate-900">Firestore (plan gratuito)</h2>
          <p className="text-sm text-slate-600">
            Desde medianoche del Pacífico. Cloud Monitoring puede publicar los datos con varios minutos de retraso.
            Las cifras son orientativas; Firebase Console es la referencia para las cuotas exactas.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Reading label="Lecturas" item={snapshot?.firestore.reads ?? { value: null, reason: "Consulta las métricas." }} quota={FREE_QUOTA.firestoreReadsPerDay} />
            <Reading label="Escrituras" item={snapshot?.firestore.writes ?? { value: null, reason: "Consulta las métricas." }} quota={FREE_QUOTA.firestoreWritesPerDay} />
            <Reading label="Eliminaciones" item={snapshot?.firestore.deletes ?? { value: null, reason: "Consulta las métricas." }} quota={FREE_QUOTA.firestoreDeletesPerDay} />
          </div>
          <a href="https://console.firebase.google.com/project/mercadito3-1ff3e/firestore/usage"
            target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-bold underline text-slate-800">
            Abrir consumo oficial de Firebase ↗
          </a>
        </section>
        <p className="rounded-2xl bg-white p-4 text-sm text-slate-700">
          No se activa ningún servicio de pago. Si Cloudflare Analytics o Google Cloud Monitoring no
          están autorizados, se mostrará «Sin datos» y podrás consultar el panel oficial del proveedor.
          Las consultas se realizan al abrir esta página o pulsar «Actualizar». Se reutiliza el
          resultado durante dos minutos para evitar peticiones repetidas.
        </p>
      </div>
    </main>
  );
}
