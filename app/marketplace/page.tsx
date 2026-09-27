"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { PublicStoreSummary } from "@/lib/store/publicMarketplace";

type StoreFilter = "all" | "open";

const CARD_LAYOUTS = [
  "lg:col-span-5 lg:row-span-2",
  "lg:col-span-4",
  "lg:col-span-3",
  "lg:col-span-3",
  "lg:col-span-4",
  "lg:col-span-5",
];

const CARD_SHAPES = [
  "market-cut-a",
  "market-cut-b",
  "market-cut-c",
  "market-cut-d",
  "market-cut-e",
  "market-cut-f",
];

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.4-3.4" />
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

function StoreMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M4 9h16l-1.5-5h-13L4 9Z" />
      <path d="M5 9v10h14V9" />
      <path d="M9 19v-5h6v5" />
      <path d="M4 9c0 1.4 1.1 2.5 2.5 2.5S9 10.4 9 9c0 1.4 1.1 2.5 2.5 2.5S14 10.4 14 9c0 1.4 1.1 2.5 2.5 2.5S19 10.4 19 9" />
    </svg>
  );
}

function DoodleStar({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m32 5 5 19 18-8-13 15 17 8-19 1 7 18-15-12-12 13 3-19-19 2 17-10L7 19l19 6Z" />
    </svg>
  );
}

function HeroPhoto({
  store,
  className,
}: {
  store?: PublicStoreSummary;
  className: string;
}) {
  return (
    <div className={className}>
      {store?.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={store.coverUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#ffd84d] text-[#12336d]">
          <StoreMark className="h-16 w-16" />
        </div>
      )}
    </div>
  );
}

export default function MarketplacePage() {
  const [stores, setStores] = useState<PublicStoreSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StoreFilter>("all");

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
    return stores.filter((store) => {
      if (filter === "open" && !store.openNow) return false;
      if (!normalizedQuery) return true;

      return [store.name, store.description, store.deliveryLocation]
        .filter(Boolean)
        .some((value) => value.toLocaleLowerCase("es-MX").includes(normalizedQuery));
    });
  }, [filter, normalizedQuery, stores]);

  const openStores = stores.filter((store) => store.openNow).length;
  const heroStores = stores.slice(0, 3);

  return (
    <main className="marketplace-collage min-h-screen overflow-hidden bg-[#fff9ee] pb-16 text-[#11224b]">
      <section className="relative isolate mx-auto max-w-[1500px] px-3 pt-4 sm:px-5 lg:px-7">
        <div className="market-hero relative min-h-[520px] overflow-hidden lg:min-h-[470px]">
          <div className="market-hero-paper absolute inset-x-0 top-0 h-[58%] bg-[#ffd84d] lg:bottom-12 lg:left-0 lg:right-auto lg:h-auto lg:w-[48%]" aria-hidden="true" />
          <div className="absolute left-[2%] top-[4%] z-20 max-w-[560px] px-5 pt-6 sm:px-9 sm:pt-8 lg:top-[7%] lg:px-12">
            <p className="market-hand text-base font-black text-[#e84b2c] sm:text-lg">de estudiantes · para la comunidad</p>
            <h1 className="mt-1 text-[3.3rem] font-black leading-[0.86] tracking-[-0.06em] text-[#102b66] sm:text-[4.8rem] lg:text-[5.7rem]">
              Tiendas de la
              <span className="block text-[#e84b2c]">comunidad</span>
            </h1>
            <p className="mt-4 max-w-lg text-sm font-bold leading-6 text-[#172b57] sm:text-base">
              Productos, antojos y proyectos creados por la comunidad Tec. Compra, descubre y apoya talento local.
            </p>
          </div>

          <div className="absolute right-[-8%] top-[16%] z-10 h-[49%] w-[74%] lg:right-[1%] lg:top-[3%] lg:h-[84%] lg:w-[58%]">
            <HeroPhoto store={heroStores[0]} className="market-hero-photo market-hero-photo-main absolute inset-0 overflow-hidden bg-[#f27948]" />
            <HeroPhoto store={heroStores[1]} className="market-hero-photo market-hero-photo-small absolute bottom-[-6%] left-[-8%] hidden h-[45%] w-[37%] overflow-hidden border-[10px] border-[#fff9ee] bg-[#255bc6] sm:block" />
            <HeroPhoto store={heroStores[2]} className="market-hero-photo market-hero-photo-note absolute right-[4%] top-[7%] hidden h-[30%] w-[24%] overflow-hidden border-[8px] border-[#fff9ee] bg-[#ff8ca0] md:block" />
          </div>

          <div className="market-note market-note-blue absolute right-[3%] top-[8%] z-30 hidden rotate-[5deg] px-5 py-4 text-center text-lg font-black leading-tight text-white lg:block">
            pequeños negocios,
            <br />
            grandes historias
          </div>

          <div className="market-note market-note-coral absolute bottom-[11%] right-[4%] z-30 hidden -rotate-[4deg] px-4 py-3 text-center text-base font-black leading-tight text-[#11224b] md:block">
            hecho por
            <br />
            estudiantes como tú
          </div>

          <DoodleStar className="absolute left-[45%] top-[7%] z-20 hidden h-10 w-10 -rotate-12 text-[#2459c8] lg:block" />
          <span className="market-scribble absolute bottom-[26%] left-[43%] z-20 hidden text-5xl font-black text-[#ef5a36] lg:block" aria-hidden="true">↗</span>

          <div className="absolute inset-x-3 bottom-3 z-40 sm:inset-x-8 lg:left-[28%] lg:right-[11%]">
            <label className="market-search flex items-center gap-3 rounded-[2rem] bg-white px-4 py-3 shadow-[0_16px_35px_rgba(17,34,75,0.18)] ring-1 ring-[#11224b]/10">
              <span className="text-[#11224b]"><SearchIcon /></span>
              <span className="sr-only">Buscar tiendas</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="¿Qué se te antoja hoy?"
                className="min-w-0 flex-1 bg-transparent text-sm font-bold text-[#11224b] outline-none placeholder:font-semibold placeholder:text-[#66718d] sm:text-base"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="rounded-full px-3 py-2 text-xs font-black text-[#66718d] hover:bg-[#fff3db]">
                  Limpiar
                </button>
              )}
            </label>
          </div>
        </div>

        <div className="relative z-30 -mt-1 flex flex-wrap items-center justify-center gap-2 px-2 sm:gap-3 lg:-mt-5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={filter === "all" ? "market-filter market-filter-active" : "market-filter"}
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#2459c8] text-white"><StoreMark className="h-4 w-4" /></span>
            Todas
          </button>
          <button
            type="button"
            onClick={() => setFilter("open")}
            className={filter === "open" ? "market-filter market-filter-active" : "market-filter"}
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#ff8ca0] text-[#11224b]">●</span>
            Abiertas ahora
          </button>
          <Link href="/orders" className="market-filter">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#ffd84d] text-[#11224b]">↗</span>
            Mis pedidos
          </Link>
          <Link href="/mystore" className="market-filter">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#f27948] text-white">★</span>
            Mis tiendas
          </Link>
        </div>
      </section>

      <section className="relative mx-auto mt-8 max-w-[1500px] px-3 sm:px-5 lg:px-7">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4 px-2 sm:px-4">
          <div className="relative">
            <p className="market-hand text-sm font-black uppercase tracking-[0.12em] text-[#e84b2c]">descubre lo que hacen tus compañeros</p>
            <h2 className="mt-1 text-4xl font-black tracking-[-0.04em] text-[#112b63] sm:text-5xl">
              Tiendas destacadas
            </h2>
            <span className="absolute -right-9 top-8 rotate-12 text-4xl text-[#f3a300]" aria-hidden="true">✦</span>
          </div>

          {!loading && !error && stores.length > 0 && (
            <div className="market-count-note rotate-[-2deg] px-4 py-2 text-sm font-black text-[#11224b]">
              {filteredStores.length} de {stores.length} tiendas
            </div>
          )}
        </div>

        {loading && (
          <div className="market-loading-note mx-auto mt-10 max-w-md rotate-[-2deg] px-6 py-8 text-center">
            <p className="market-hand text-xl font-black text-[#11224b]">Armando el mercadito…</p>
          </div>
        )}

        {!loading && error && (
          <div className="market-error-note mx-auto mt-8 max-w-xl px-6 py-6 text-center font-black text-[#7b1d20]">
            {error}
          </div>
        )}

        {!loading && !error && stores.length === 0 && (
          <div className="market-empty-note mx-auto mt-8 max-w-xl px-8 py-10 text-center">
            <StoreMark className="mx-auto h-12 w-12 text-[#2459c8]" />
            <h3 className="mt-3 text-2xl font-black text-[#11224b]">Todavía no hay tiendas activas</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#5e6780]">Las tiendas aparecerán aquí después de ser aprobadas.</p>
          </div>
        )}

        {!loading && !error && stores.length > 0 && filteredStores.length === 0 && (
          <div className="market-empty-note mx-auto mt-8 max-w-xl px-8 py-10 text-center">
            <h3 className="text-2xl font-black text-[#11224b]">No encontramos esa tienda</h3>
            <p className="mt-2 text-sm font-semibold text-[#5e6780]">Prueba con otro nombre o cambia el filtro.</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
              className="mt-5 rounded-full bg-[#2459c8] px-5 py-2.5 text-sm font-black text-white"
            >
              Ver todas
            </button>
          </div>
        )}

        {!loading && !error && filteredStores.length > 0 && (
          <div className="market-mosaic grid auto-rows-[minmax(190px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:gap-5">
            {filteredStores.map((store, index) => {
              const large = index % 6 === 0;
              const shape = CARD_SHAPES[index % CARD_SHAPES.length];
              const layout = CARD_LAYOUTS[index % CARD_LAYOUTS.length];

              return (
                <Link
                  key={store.id}
                  href={`/marketplace/stores/${store.slug}`}
                  className={`group relative block min-h-[250px] ${layout}`}
                >
                  <article className={`market-store-card ${shape} relative h-full min-h-[250px] overflow-hidden bg-white transition duration-200 group-hover:-translate-y-1 ${large ? "lg:min-h-[520px]" : "lg:min-h-[250px]"}`}>
                    <div className={`relative overflow-hidden bg-[#d9e7ff] ${large ? "h-[58%] min-h-[240px]" : "h-[150px]"}`}>
                      {store.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={store.coverUrl} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-[#ffd84d] text-[#2459c8]">
                          <StoreMark className="h-14 w-14" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#11224b]/35 via-transparent to-transparent" aria-hidden="true" />

                      <span className={`absolute right-4 top-4 rounded-full px-3 py-1.5 text-xs font-black shadow-md ${store.openNow ? "bg-[#dbe7ff] text-[#174ebc]" : "bg-[#ffe1e0] text-[#9d2e2e]"}`}>
                        {store.openNow ? "● Abierta" : "● Cerrada"}
                      </span>

                      <div className={`market-photo-caption absolute ${index % 2 === 0 ? "left-4 top-4 -rotate-3" : "bottom-4 left-4 rotate-2"} max-w-[55%] px-3 py-2 text-sm font-black leading-tight text-[#11224b]`}>
                        {index % 3 === 0 ? "hecho con talento local" : index % 3 === 1 ? "ideas que se antojan" : "pequeños negocios, grandes historias"}
                      </div>
                    </div>

                    <div className={`relative px-5 pb-6 ${large ? "pt-12" : "pt-10"}`}>
                      <div className="absolute -top-9 left-5 flex h-20 w-20 items-center justify-center overflow-hidden rounded-[42%_58%_48%_52%/55%_42%_58%_45%] border-[5px] border-white bg-[#fff4d6] shadow-lg">
                        {store.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={store.logoUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <StoreMark className="h-8 w-8 text-[#2459c8]" />
                        )}
                      </div>

                      <h3 className={`font-black tracking-[-0.03em] text-[#11224b] ${large ? "text-3xl" : "text-xl"}`}>
                        {store.name}
                      </h3>
                      <p className={`mt-2 font-semibold leading-5 text-[#5e6780] ${large ? "line-clamp-3 text-base" : "line-clamp-2 text-sm"}`}>
                        {store.description || "Conoce esta tienda y descubre lo que ofrece."}
                      </p>

                      {store.deliveryLocation && (
                        <p className="mt-4 flex items-center gap-2 text-xs font-black text-[#50607f]">
                          <span className="text-[#2459c8]"><PinIcon /></span>
                          <span className="line-clamp-1">{store.deliveryLocation}</span>
                        </p>
                      )}

                      <div className="mt-4 flex items-center justify-between">
                        <span className="market-hand text-sm font-black text-[#e84b2c]">entra a la tienda</span>
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#2459c8] text-lg font-black text-white transition group-hover:translate-x-1">→</span>
                      </div>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}

        <div className="relative mt-10 hidden min-h-24 items-center justify-between overflow-hidden px-7 py-5 text-white md:flex">
          <div className="market-footer-ribbon absolute inset-0 bg-[#12336d]" aria-hidden="true" />
          <p className="market-hand relative z-10 max-w-xl text-2xl font-black">más estudiantes · más ideas · más historias</p>
          <Link href="/chat" className="relative z-10 rounded-full bg-[#ffd84d] px-5 py-2.5 text-sm font-black text-[#11224b]">
            Conecta con la comunidad →
          </Link>
        </div>
      </section>
    </main>
  );
}
