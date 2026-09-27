"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { DEMO_MARKETPLACE_HERO, DEMO_STORES } from "@/lib/store/demoMarketplace";
import type { PublicStoreSummary } from "@/lib/store/publicMarketplace";

type CategoryId = "all" | "food" | "drinks" | "desserts" | "crafts" | "stationery";

const CATEGORIES: Array<{ id: CategoryId; label: string; icon: string }> = [
  { id: "food", label: "Comida", icon: "🌮" },
  { id: "drinks", label: "Bebidas", icon: "🥤" },
  { id: "desserts", label: "Postres", icon: "🧁" },
  { id: "crafts", label: "Artesanías", icon: "💝" },
  { id: "stationery", label: "Papelería", icon: "📝" },
  { id: "all", label: "Más categorías", icon: "⭐" },
];

const DEMO_CATEGORY: Record<string, CategoryId> = {
  "demo-postres-ana": "desserts",
  "demo-snack-lab": "food",
  "demo-tortas-punto": "food",
  "demo-cafe-campus": "drinks",
  "demo-artesanias": "crafts",
  "demo-papeleria": "stationery",
};

const STORE_ACCENTS = [
  { label: "POSTRES", note: "la vida es más dulce en el Tec ♡", color: "#ff9fb7" },
  { label: "SNACK LAB", note: "ideas que también se antojan", color: "#2e69d7" },
  { label: "TORTAS EL PUNTO", note: "buenas tortas, mejores pláticas", color: "#ffd251" },
  { label: "CAFÉ DEL CAMPUS", note: "café · ideas · amigos · planes", color: "#f7e6bf" },
  { label: "ARTESANÍAS", note: "arte que conecta", color: "#ff9fbc" },
  { label: "PAPELERÍA EXPRESS", note: "tus ideas también necesitan herramientas", color: "#ff94c0" },
];

function getStoreCategory(store: PublicStoreSummary): CategoryId {
  const demo = DEMO_CATEGORY[store.id];
  if (demo) return demo;

  const text = `${store.name} ${store.description}`.toLocaleLowerCase("es-MX");
  if (/postre|pastel|cupcake|brownie|galleta|dulce/.test(text)) return "desserts";
  if (/café|cafe|bebida|jugo|frapp|té|te\b/.test(text)) return "drinks";
  if (/artesan|joyer|accesorio|hecho a mano/.test(text)) return "crafts";
  if (/papeler|libreta|útil|util|cuaderno|pluma/.test(text)) return "stationery";
  return "food";
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function CommunityIllustration() {
  return (
    <svg viewBox="0 0 360 250" className="h-full w-full" aria-hidden="true">
      <g fill="none" stroke="#12346f" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7">
        <circle cx="105" cy="70" r="27" fill="#fff9ee" />
        <path d="M64 174c3-47 19-72 43-72 24 0 40 25 44 72" fill="#ff8b59" />
        <circle cx="190" cy="83" r="25" fill="#fff9ee" />
        <path d="M151 182c4-45 17-72 39-72 24 0 39 27 42 72" fill="#fff" />
        <circle cx="269" cy="76" r="27" fill="#fff9ee" />
        <path d="M226 180c5-47 20-75 44-75 23 0 39 28 43 75" fill="#ff9db2" />
        <path d="M78 55c8-18 27-25 44-13M170 68c10-17 28-20 43-7M246 59c11-18 30-23 47-8" />
        <path d="M92 78c6 6 17 6 23 0M179 91c6 6 16 6 22 0M258 85c7 6 17 6 24 0" />
        <path d="M128 116c14 8 26 21 30 40M216 123c12 9 21 21 25 36" />
        <path d="M43 28l17 9M51 18l7 17M315 39l18-8M320 53l19 2" stroke="#ef5b35" />
        <path d="M310 18c10 3 14 12 9 23" stroke="#ffd251" />
      </g>
    </svg>
  );
}

function CampusPanel() {
  return (
    <div className="mt3-campus-panel">
      <div className="mt3-campus-photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=900&q=86"
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
      <div className="mt3-campus-note mt3-hand">UN CAMPUS<br />LLENO DE<br />TALENTO :)</div>
    </div>
  );
}

function StoreTile({
  store,
  index,
  previewMode,
  onPreview,
}: {
  store: PublicStoreSummary;
  index: number;
  previewMode: boolean;
  onPreview: (store: PublicStoreSummary) => void;
}) {
  const accent = STORE_ACCENTS[index % STORE_ACCENTS.length];

  const body = (
    <article className={`mt3-store mt3-store-${index % 6}`}>
      <div className="mt3-store-image">
        {store.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-[#ffd251] text-5xl">🏪</div>
        )}
        <div className="mt3-store-label mt3-hand" style={{ backgroundColor: accent.color }}>
          {accent.label}
        </div>
        <div className="mt3-store-photo-note mt3-hand">{accent.note}</div>
      </div>

      <div className="mt3-store-body">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-xl font-black tracking-[-0.035em] text-[#102c68]">{store.name}</h3>
            <span className={store.openNow ? "mt3-state mt3-state-open" : "mt3-state mt3-state-closed"}>
              {store.openNow ? "Abierta" : "Cerrada"}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-[#59637a]">{store.description}</p>
          {store.deliveryLocation && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-black text-[#52617f]">
              <PinIcon />
              {store.deliveryLocation}
            </p>
          )}
        </div>
      </div>
    </article>
  );

  if (previewMode) {
    return (
      <button type="button" className="mt3-store-action" onClick={() => onPreview(store)} aria-label={`Previsualizar ${store.name}`}>
        {body}
      </button>
    );
  }

  return (
    <Link className="mt3-store-action" href={`/marketplace/stores/${store.slug}`}>
      {body}
    </Link>
  );
}

export default function MarketplacePage() {
  const [liveStores, setLiveStores] = useState<PublicStoreSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryId>("all");
  const [previewStore, setPreviewStore] = useState<PublicStoreSummary | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/marketplace")
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "No se pudo cargar el Mercadito.");
        if (!cancelled) setLiveStores(Array.isArray(data.stores) ? data.stores : []);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el Mercadito.");
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

  const stores = useMemo(() => {
    return sourceStores.filter((store) => {
      const matchesCategory = category === "all" || getStoreCategory(store) === category;
      const matchesQuery =
        !normalizedQuery ||
        [store.name, store.description, store.deliveryLocation]
          .filter(Boolean)
          .some((value) => value.toLocaleLowerCase("es-MX").includes(normalizedQuery));

      return matchesCategory && matchesQuery;
    });
  }, [category, normalizedQuery, sourceStores]);

  const heroImage = previewMode ? DEMO_MARKETPLACE_HERO : sourceStores[0]?.coverUrl ?? DEMO_MARKETPLACE_HERO;
  const firstSix = stores.slice(0, 6);

  return (
    <main className="mt3-page">
      <section className="mt3-hero">
        <div className="mt3-hero-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroImage} alt="" className="h-full w-full object-cover" />
        </div>

        <div className="mt3-title-panel">
          <p className="mt3-hand mt3-kicker">DE ESTUDIANTES · PARA ESTUDIANTES</p>
          <h1>Tiendas de la <span>comunidad</span></h1>
          <p className="mt3-hero-copy">Comida · bebidas · artesanías<br />papelería · y mucho más</p>
        </div>

        <div className="mt3-sticky mt3-sticky-pink mt3-hand">Apoya<br />compra<br />disfruta<br />conecta :)</div>
        <div className="mt3-sticky mt3-sticky-blue mt3-hand">PEQUEÑOS<br />NEGOCIOS<br /><strong>GRANDES<br />HISTORIAS</strong> ♡</div>
        <div className="mt3-sticky mt3-sticky-coral mt3-hand">HECHO<br />POR<br />ESTUDIANTES<br />COMO TÚ :)</div>
      </section>

      <section className="mt3-discovery">
        <CampusPanel />

        <div className="mt3-discovery-center">
          <form className="mt3-search" onSubmit={(event) => event.preventDefault()}>
            <SearchIcon />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Busca comida, bebidas, papelería, artesanías..."
              aria-label="Buscar tiendas"
            />
            <button type="submit">Buscar</button>
          </form>

          <div className="mt3-categories" aria-label="Categorías">
            {CATEGORIES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategory(item.id)}
                className={category === item.id ? "mt3-category mt3-category-active" : "mt3-category"}
              >
                <span className="mt3-category-icon">{item.icon}</span>
                <span className="mt3-hand">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt3-community-art">
          <CommunityIllustration />
          <div className="mt3-community-copy mt3-hand">MISMAS<br />IDEAS<br /><strong>MÁS<br />COMUNIDAD</strong> ♡</div>
        </div>
      </section>

      <section className="mt3-featured">
        <div className="mt3-heading">
          <span className="mt3-heading-stroke" aria-hidden="true" />
          <h2>Tiendas destacadas</h2>
          <span className="mt3-star" aria-hidden="true">✦</span>
        </div>

        {previewMode && (
          <div className="mt3-demo-label">
            VISTA DEMO · estas tiendas son ficticias y solo sirven para previsualizar la interfaz
          </div>
        )}

        {loading && <div className="mt3-message mt3-hand">Cargando tiendas...</div>}
        {!loading && error && <div className="mt3-message mt3-message-error">{error}</div>}

        {!loading && !error && firstSix.length === 0 && (
          <div className="mt3-message">No hay coincidencias. Cambia la búsqueda o la categoría.</div>
        )}

        {!loading && !error && firstSix.length > 0 && (
          <div className="mt3-store-layout">
            {firstSix.map((store, index) => (
              <StoreTile
                key={store.id}
                store={store}
                index={index}
                previewMode={previewMode}
                onPreview={setPreviewStore}
              />
            ))}

            <div className="mt3-bottom-community">
              <div className="mt3-bottom-photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1100&q=84"
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="mt3-bottom-copy mt3-hand">MÁS ESTUDIANTES<br />MÁS HISTORIAS ♡</div>
            </div>
          </div>
        )}
      </section>

      {previewStore && (
        <div className="mt3-modal-backdrop" role="presentation" onMouseDown={() => setPreviewStore(null)}>
          <section className="mt3-modal" role="dialog" aria-modal="true" aria-labelledby="demo-store-title" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="mt3-modal-close" onClick={() => setPreviewStore(null)} aria-label="Cerrar">×</button>
            {previewStore.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewStore.coverUrl} alt="" className="mt3-modal-image" />
            )}
            <p className="mt3-demo-chip">TIENDA DEMO</p>
            <h2 id="demo-store-title">{previewStore.name}</h2>
            <p>{previewStore.description}</p>
            <p className="mt3-modal-location"><PinIcon /> {previewStore.deliveryLocation}</p>
            <p className="mt3-modal-note">Esta ficha es solo una previsualización. Cuando existan tiendas reales, al tocar una se abrirá su página pública completa.</p>
          </section>
        </div>
      )}
    </main>
  );
}
