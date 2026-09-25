"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { PublicStoreSummary } from "@/lib/store/publicMarketplace";

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 9h16l-1.5-5h-13L4 9Z" />
      <path d="M5 9v10h14V9" />
      <path d="M9 19v-5h6v5" />
      <path d="M4 9c0 1.4 1.1 2.5 2.5 2.5S9 10.4 9 9c0 1.4 1.1 2.5 2.5 2.5S14 10.4 14 9c0 1.4 1.1 2.5 2.5 2.5S19 10.4 19 9" />
    </svg>
  );
}

export default function MarketplacePage() {
  const [stores, setStores] = useState<PublicStoreSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

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

  const normalizedQuery = query.trim().toLocaleLowerCase("es-MX");
  const filteredStores = useMemo(() => {
    if (!normalizedQuery) return stores;

    return stores.filter((store) =>
      [store.name, store.description, store.deliveryLocation]
        .filter(Boolean)
        .some((value) => value.toLocaleLowerCase("es-MX").includes(normalizedQuery)),
    );
  }, [normalizedQuery, stores]);

  const openStores = stores.filter((store) => store.openNow).length;

  return (
    <main className="min-h-screen bg-[#f5f3ee] pb-12 text-slate-950">
      <section className="relative overflow-hidden border-b border-black/5 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.24),_transparent_34%),radial-gradient(circle_at_85%_15%,_rgba(251,191,36,0.24),_transparent_28%),linear-gradient(135deg,#0f172a_0%,#172033_50%,#0f172a_100%)] text-white">
        <div className="absolute -left-20 top-20 h-64 w-64 rounded-full border border-white/10" aria-hidden="true" />
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/10" aria-hidden="true" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-11 lg:px-8 lg:py-14">
          <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-emerald-200 backdrop-blur">
                <StoreIcon />
                Mercadito Tec 3
              </div>

              <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                Tiendas de la comunidad
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Descubre productos creados y vendidos por la comunidad. Explora tiendas aprobadas, consulta horarios y encuentra tu punto de entrega.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                  <p className="text-2xl font-black">{loading ? "—" : stores.length}</p>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-300">Tiendas activas</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                  <p className="text-2xl font-black text-emerald-300">{loading ? "—" : openStores}</p>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-300">Abiertas ahora</p>
                </div>
              </div>
            </div>

            <div className="grid gap-2 rounded-3xl border border-white/10 bg-white/10 p-3 shadow-2xl backdrop-blur-md">
              <Link
                href="/orders"
                className="flex items-center justify-between rounded-2xl bg-emerald-400 px-4 py-3.5 font-black text-slate-950 transition hover:bg-emerald-300"
              >
                <span>Mis pedidos</span>
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/mystore"
                className="flex items-center justify-between rounded-2xl bg-white px-4 py-3.5 font-black text-slate-950 transition hover:bg-slate-100"
              >
                <span>Administrar mis tiendas</span>
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/chat"
                className="flex items-center justify-between rounded-2xl border border-white/15 px-4 py-3.5 font-bold text-white transition hover:bg-white/10"
              >
                <span>Chat general</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <section className="relative -mt-5 z-10 rounded-3xl border border-black/5 bg-white p-3 shadow-xl shadow-slate-900/5 sm:p-4">
          <label className="relative block">
            <span className="sr-only">Buscar tiendas</span>
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por tienda, producto o punto de entrega"
              className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-base font-semibold text-slate-950 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            />
          </label>
        </section>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700">Explorar</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Encuentra tu próxima tienda favorita
            </h2>
          </div>
          {!loading && !error && stores.length > 0 && (
            <p className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-500 shadow-sm ring-1 ring-black/5">
              {filteredStores.length} de {stores.length} tienda{stores.length === 1 ? "" : "s"}
            </p>
          )}
        </div>

        {loading && (
          <section className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="overflow-hidden rounded-[1.75rem] bg-white shadow-sm ring-1 ring-black/5">
                <div className="h-44 animate-pulse bg-slate-200" />
                <div className="p-5">
                  <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />
                  <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-100" />
                  <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </section>
        )}

        {!loading && error && (
          <section className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-6 font-semibold text-red-700 shadow-sm">
            {error}
          </section>
        )}

        {!loading && !error && stores.length === 0 && (
          <section className="mt-6 overflow-hidden rounded-[2rem] border border-black/5 bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <StoreIcon />
            </div>
            <h2 className="mt-5 text-2xl font-black text-slate-950">Todavía no hay tiendas activas</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600 sm:text-base">
              Las tiendas aparecerán aquí después de ser revisadas y aprobadas por administración.
            </p>
          </section>
        )}

        {!loading && !error && stores.length > 0 && filteredStores.length === 0 && (
          <section className="mt-6 rounded-[2rem] border border-black/5 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-black text-slate-950">No encontramos coincidencias</h2>
            <p className="mt-2 text-sm text-slate-600">
              Prueba con otro nombre de tienda o punto de entrega.
            </p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-5 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800"
            >
              Limpiar búsqueda
            </button>
          </section>
        )}

        {!loading && !error && filteredStores.length > 0 && (
          <section className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredStores.map((store) => (
              <Link
                key={store.id}
                href={`/marketplace/stores/${store.slug}`}
                className="group overflow-hidden rounded-[1.75rem] bg-white shadow-sm ring-1 ring-black/5 transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10"
              >
                <div className="relative h-48 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
                  {store.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={store.coverUrl}
                      alt=""
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-white/75">
                      <StoreIcon />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" aria-hidden="true" />

                  <span
                    className={`absolute right-4 top-4 rounded-full px-3 py-1.5 text-xs font-black shadow-lg backdrop-blur ${store.openNow
                      ? "bg-emerald-400 text-emerald-950"
                      : "bg-white/90 text-slate-700"
                    }`}
                  >
                    {store.openNow ? "Abierta ahora" : "Cerrada"}
                  </span>
                </div>

                <div className="relative px-5 pb-5 pt-12">
                  <div className="absolute -top-9 left-5 h-18 w-18 overflow-hidden rounded-2xl border-4 border-white bg-slate-100 shadow-lg">
                    {store.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={store.logoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-500">
                        <StoreIcon />
                      </div>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-xl font-black tracking-tight text-slate-950 transition group-hover:text-emerald-700">
                        {store.name}
                      </h3>
                      <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-600">
                        {store.description || "Conoce esta tienda y explora sus productos."}
                      </p>
                    </div>
                  </div>

                  {store.deliveryLocation && (
                    <div className="mt-4 flex items-start gap-2 rounded-2xl bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700">
                      <span className="mt-0.5 text-emerald-700">
                        <PinIcon />
                      </span>
                      <span className="line-clamp-2">{store.deliveryLocation}</span>
                    </div>
                  )}

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-sm font-black text-emerald-700">Entrar a la tienda</span>
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 font-black text-emerald-700 transition group-hover:bg-emerald-600 group-hover:text-white"
                    >
                      →
                    </span>
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
