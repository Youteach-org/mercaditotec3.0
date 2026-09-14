"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { PublicStoreSummary } from "@/lib/store/publicMarketplace";

export default function MarketplacePage() {
  const [stores, setStores] = useState<PublicStoreSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/marketplace")
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "No se pudo cargar el Mercadito.");
        if (!cancelled) setStores(Array.isArray(data.stores) ? data.stores : []);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el Mercadito.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 sm:px-6 sm:py-7">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-300">
                Mercadito Tec 3
              </p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">Tiendas de la comunidad</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Explora únicamente tiendas revisadas y aprobadas. Entra a cada tienda para ver sus productos, horarios y punto de entrega.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/orders"
                className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-emerald-300"
              >
                Mis pedidos
              </Link>
              <Link
                href="/mystore"
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-slate-100"
              >
                Mis tiendas
              </Link>
              <Link
                href="/chat"
                className="rounded-xl border border-white/25 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10"
              >
                Chat general
              </Link>
            </div>
          </div>
        </header>

        {loading && (
          <section className="rounded-2xl bg-white p-6 text-slate-600 shadow-sm">
            Cargando tiendas...
          </section>
        )}

        {!loading && error && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5 font-semibold text-red-700">
            {error}
          </section>
        )}

        {!loading && !error && stores.length === 0 && (
          <section className="rounded-2xl bg-white p-7 text-center shadow-sm">
            <div className="text-4xl" aria-hidden="true">🏪</div>
            <h2 className="mt-3 text-xl font-black text-slate-900">Todavía no hay tiendas activas</h2>
            <p className="mt-2 text-sm text-slate-600">
              Las tiendas aparecerán aquí después de ser aprobadas por administración.
            </p>
          </section>
        )}

        {!loading && !error && stores.length > 0 && (
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => (
              <Link
                key={store.id}
                href={`/marketplace/stores/${store.slug}`}
                className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="relative h-36 bg-gradient-to-br from-slate-800 to-slate-600">
                  {store.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={store.coverUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl" aria-hidden="true">🏬</div>
                  )}

                  <span
                    className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-black shadow-sm ${
                      store.openNow
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {store.openNow ? "Abierta" : "Cerrada"}
                  </span>
                </div>

                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
                      {store.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={store.logoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xl" aria-hidden="true">🛍️</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-xl font-black text-slate-950 group-hover:text-emerald-700">
                        {store.name}
                      </h2>
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-600">
                        {store.description || "Sin descripción."}
                      </p>
                    </div>
                  </div>

                  {store.deliveryLocation && (
                    <p className="mt-4 flex gap-2 text-sm font-semibold text-slate-700">
                      <span aria-hidden="true">📍</span>
                      <span>{store.deliveryLocation}</span>
                    </p>
                  )}

                  <div className="mt-4 border-t border-slate-100 pt-4 text-sm font-black text-emerald-700">
                    Ver tienda →
                  </div>
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
