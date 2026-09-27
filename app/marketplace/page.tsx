"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { DEMO_MARKETPLACE_HERO, DEMO_STORES } from "@/lib/store/demoMarketplace";
import type { PublicStoreSummary } from "@/lib/store/publicMarketplace";

type StoreFilter = "all" | "open";

const PREVIEW_TAGS = [
  "postres que alegran el día ♡",
  "snacks para cada break",
  "buenas tortas, mejores ideas",
  "café · ideas · amigos",
  "arte que conecta",
  "todo para tus grandes ideas",
];

const PREVIEW_BADGES = ["POSTRES", "SNACK LAB", "TORTAS", "CAFÉ", "ARTESANÍAS", "PAPELERÍA"];

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

function StoreIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M4 9h16l-1.5-5h-13L4 9Z" />
      <path d="M5 9v10h14V9" />
      <path d="M9 19v-5h6v5" />
      <path d="M4 9c0 1.4 1.1 2.5 2.5 2.5S9 10.4 9 9c0 1.4 1.1 2.5 2.5 2.5S14 10.4 14 9c0 1.4 1.1 2.5 2.5 2.5S19 10.4 19 9" />
    </svg>
  );
}

function DemoLogo({ name, index }: { name: string; index: number }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <div className={`demo-logo demo-logo-${index % 6}`} aria-hidden="true">
      <span>{initials}</span>
    </div>
  );
}

function StorePiece({
  store,
  index,
  previewMode,
}: {
  store: PublicStoreSummary;
  index: number;
  previewMode: boolean;
}) {
  const article = (
    <article className={`approved-store-piece approved-store-piece-${index % 6}`}>
      <div className="approved-store-photo">
        {store.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-[#ffd34e] text-[#12336d]">
            <StoreIcon className="h-14 w-14" />
          </div>
        )}

        <div className="approved-store-badge">
          {PREVIEW_BADGES[index % PREVIEW_BADGES.length]}
        </div>

        <div className="approved-store-doodle">
          {PREVIEW_TAGS[index % PREVIEW_TAGS.length]}
        </div>
      </div>

      <div className="approved-store-info">
        <div className="approved-store-logo">
          {store.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <DemoLogo name={store.name} index={index} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-lg font-black tracking-[-0.035em] text-[#10275b] sm:text-xl">
              {store.name}
            </h3>
            <span className={store.openNow ? "approved-status approved-status-open" : "approved-status approved-status-closed"}>
              {store.openNow ? "Abierta" : "Cerrada"}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-[#5c6580]">
            {store.description}
          </p>
          {store.deliveryLocation && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-black text-[#596985]">
              <span className="text-[#205ac7]"><PinIcon /></span>
              {store.deliveryLocation}
            </p>
          )}
        </div>
      </div>
    </article>
  );

  if (previewMode) {
    return <div className={`approved-store-slot approved-store-slot-${index % 6}`}>{article}</div>;
  }

  return (
    <Link href={`/marketplace/stores/${store.slug}`} className={`approved-store-slot approved-store-slot-${index % 6}`}>
      {article}
    </Link>
  );
}

export default function MarketplacePage() {
  const [liveStores, setLiveStores] = useState<PublicStoreSummary[]>([]);
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
        if (!cancelled) setLiveStores(Array.isArray(data.stores) ? data.stores : []);
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

  const previewMode = !loading && !error && liveStores.length === 0;
  const sourceStores = previewMode ? DEMO_STORES : liveStores;
  const normalizedQuery = query.trim().toLocaleLowerCase("es-MX");

  const filteredStores = useMemo(() => {
    return sourceStores.filter((store) => {
      if (filter === "open" && !store.openNow) return false;
      if (!normalizedQuery) return true;

      return [store.name, store.description, store.deliveryLocation]
        .filter(Boolean)
        .some((value) => value.toLocaleLowerCase("es-MX").includes(normalizedQuery));
    });
  }, [filter, normalizedQuery, sourceStores]);

  const openStores = sourceStores.filter((store) => store.openNow).length;
  const featuredStores = filteredStores.slice(0, 6);
  const additionalStores = filteredStores.slice(6);
  const heroImage = previewMode ? DEMO_MARKETPLACE_HERO : sourceStores[0]?.coverUrl;

  return (
    <main className="approved-marketplace min-h-screen overflow-hidden bg-[#fff9ee] pb-14 text-[#10275b]">
      <section className="approved-hero relative mx-auto max-w-[1560px] overflow-hidden">
        <div className="approved-hero-photo" aria-hidden="true">
          {heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-[#7db5f1]" />
          )}
        </div>

        <div className="approved-title-paper">
          <p className="approved-hand text-sm font-black uppercase tracking-[0.08em] text-[#ef5b35] sm:text-base">
            de estudiantes · para estudiantes
          </p>
          <h1 className="mt-1 text-[3.7rem] font-black leading-[0.82] tracking-[-0.065em] text-[#0d2c69] sm:text-[5.2rem] lg:text-[6.7rem]">
            Tiendas de la
            <span className="block text-[#e94f2f]">comunidad</span>
          </h1>
          <p className="mt-5 max-w-[520px] text-sm font-bold leading-6 text-[#183568] sm:text-base">
            Descubre productos, antojos y proyectos creados por la comunidad. Compra local, conecta y apoya talento estudiantil.
          </p>
        </div>

        <div className="approved-hero-note approved-hero-note-blue">
          <span>pequeños negocios</span>
          <strong>grandes historias</strong>
        </div>

        <div className="approved-hero-note approved-hero-note-coral">
          hecho por
          <br />
          estudiantes como tú
        </div>

        <div className="approved-hero-scribble approved-hand">más que compras,<br />somos comunidad ♡</div>

        {previewMode && (
          <div className="approved-demo-stamp">
            VISTA DEMO
            <span>datos ficticios de previsualización</span>
          </div>
        )}
      </section>

      <section className="relative z-20 mx-auto -mt-8 max-w-[1120px] px-4">
        <label className="approved-search flex items-center gap-3 bg-white px-5 py-3.5 shadow-[0_18px_36px_rgba(16,39,91,0.16)]">
          <SearchIcon />
          <span className="sr-only">Buscar tiendas</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Busca tiendas, antojos o puntos de entrega..."
            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-[#10275b] outline-none placeholder:text-[#7c8498] sm:text-base"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="approved-hand text-xs font-black text-[#e94f2f]">
              limpiar
            </button>
          )}
        </label>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
          <button type="button" onClick={() => setFilter("all")} className={filter === "all" ? "approved-filter approved-filter-active" : "approved-filter"}>
            <StoreIcon className="h-4 w-4" />
            Todas
          </button>
          <button type="button" onClick={() => setFilter("open")} className={filter === "open" ? "approved-filter approved-filter-active" : "approved-filter"}>
            <span aria-hidden="true">●</span>
            Abiertas ahora
          </button>
          <Link href="/orders" className="approved-filter">Mis pedidos</Link>
          <Link href="/mystore" className="approved-filter">Mis tiendas</Link>
        </div>
      </section>

      <section className="relative mx-auto mt-8 max-w-[1500px] px-3 sm:px-5 lg:px-7">
        <div className="approved-section-heading">
          <span className="approved-section-paint" aria-hidden="true" />
          <h2 className="relative text-4xl font-black tracking-[-0.05em] text-[#10275b] sm:text-5xl">Tiendas destacadas</h2>
          <span className="approved-heading-star" aria-hidden="true">✦</span>
        </div>

        {loading && (
          <div className="approved-paper-message mx-auto mt-16 max-w-md">
            <p className="approved-hand text-xl font-black">Armando el mercadito…</p>
          </div>
        )}

        {!loading && error && (
          <div className="approved-paper-message approved-paper-error mx-auto mt-12 max-w-xl">{error}</div>
        )}

        {!loading && !error && filteredStores.length === 0 && (
          <div className="approved-paper-message mx-auto mt-12 max-w-xl">
            <h3 className="text-xl font-black">No encontramos coincidencias.</h3>
            <button type="button" onClick={() => { setQuery(""); setFilter("all"); }} className="mt-4 rounded-full bg-[#205ac7] px-5 py-2.5 text-sm font-black text-white">
              Ver todas
            </button>
          </div>
        )}

        {!loading && !error && featuredStores.length > 0 && (
          <div className="approved-collage-board">
            <div className="approved-collage-note approved-hand">apoya talento Tec ↘</div>
            <div className="approved-collage-note approved-collage-note-right approved-hand">mismas ideas,<br />más comunidad ♡</div>

            {featuredStores.map((store, index) => (
              <StorePiece key={store.id} store={store} index={index} previewMode={previewMode} />
            ))}
          </div>
        )}

        {additionalStores.length > 0 && (
          <div className="approved-more-wrap mt-14">
            <h3 className="approved-hand mb-5 text-2xl font-black text-[#e94f2f]">más tiendas para descubrir ↓</h3>
            <div className="flex flex-wrap gap-5">
              {additionalStores.map((store, index) => (
                <Link key={store.id} href={`/marketplace/stores/${store.slug}`} className="approved-more-piece">
                  <div className="h-28 overflow-hidden rounded-[30%_18%_26%_16%/18%_30%_16%_28%] bg-[#dbe8ff]">
                    {store.coverUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={store.coverUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="-mt-3 px-3 pb-3">
                    <h4 className="font-black">{store.name}</h4>
                    <p className="text-xs font-semibold text-[#6a7287]">{store.deliveryLocation}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 px-3">
            <p className="approved-hand text-lg font-black text-[#e94f2f]">
              {previewMode ? "Así se verá cuando lleguen las primeras tiendas reales." : `${openStores} abiertas ahora · ${sourceStores.length} activas`}
            </p>
            <Link href="/chat" className="approved-community-link">
              comunidad, ideas y conversaciones →
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
