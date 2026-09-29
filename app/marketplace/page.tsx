"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  DEMO_MARKETPLACE_STORES,
  type DemoMarketplaceCategory,
  type DemoMarketplaceStore,
} from "@/lib/store/demoMarketplace";
import type { PublicStoreSummary } from "@/lib/store/publicMarketplace";

type CategoryId = "all" | DemoMarketplaceCategory;

const CATEGORY_ITEMS: Array<{ id: CategoryId; label: string }> = [
  { id: "food", label: "Comida" },
  { id: "drinks", label: "Bebidas" },
  { id: "desserts", label: "Postres" },
  { id: "crafts", label: "Artesanías" },
  { id: "stationery", label: "Papelería" },
  { id: "all", label: "Más categorías" },
];

const CARD_NOTES = [
  "LA VIDA ES MÁS DULCE EN EL TEC :)",
  "IDEAS QUE TAMBIÉN SE ANTOJAN :)",
  "BUENAS TORTAS, MEJORES PLÁTICAS",
  "CAFÉ · IDEAS · AMIGOS · PLANES",
  "ARTE QUE CONECTA ♡",
  "TUS IDEAS TAMBIÉN NECESITAN BUENAS HERRAMIENTAS :)",
];

function inferredCategory(store: PublicStoreSummary): DemoMarketplaceCategory {
  if ("demoCategory" in store) {
    return (store as DemoMarketplaceStore).demoCategory;
  }

  const text = `${store.name} ${store.description ?? ""}`.toLocaleLowerCase("es-MX");
  if (/postre|pastel|cupcake|brownie|galleta|dulce/.test(text)) return "desserts";
  if (/café|cafe|bebida|jugo|frapp|té|te\b/.test(text)) return "drinks";
  if (/artesan|joyer|accesorio|hecho a mano/.test(text)) return "crafts";
  if (/papeler|libreta|cuaderno|pluma|útil|util/.test(text)) return "stationery";
  return "food";
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mkt-search-icon" fill="none" stroke="currentColor" strokeWidth="2.2">
      <circle cx="10.5" cy="10.5" r="6.7" />
      <path d="m16 16 5 5" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mkt-pin-icon" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function CategoryIcon({ id }: { id: CategoryId }) {
  const common = "mkt-category-svg";

  if (id === "food") {
    return (
      <svg viewBox="0 0 64 64" className={common} aria-hidden="true">
        <path d="M10 38c3-17 13-25 25-25 11 0 18 6 22 18-10 1-17 5-23 13-7-5-15-7-24-6Z" />
        <path d="M13 35c11-7 26-9 40-4M27 18c-5 3-8 7-9 12M39 16c-4 4-6 8-6 13" />
      </svg>
    );
  }

  if (id === "drinks") {
    return (
      <svg viewBox="0 0 64 64" className={common} aria-hidden="true">
        <path d="M20 14h25l-3 36H24l-4-36Z" />
        <path d="M18 14h29M34 12l8-8M29 23c5 1 9 1 13 0" />
      </svg>
    );
  }

  if (id === "desserts") {
    return (
      <svg viewBox="0 0 64 64" className={common} aria-hidden="true">
        <path d="M19 30h28l-4 22H23l-4-22Z" />
        <path d="M17 30c2-8 7-12 13-11 2-7 8-8 12-3 7 0 10 5 9 14H17Z" />
        <path d="M33 14c-2-5 1-8 6-7" />
      </svg>
    );
  }

  if (id === "crafts") {
    return (
      <svg viewBox="0 0 64 64" className={common} aria-hidden="true">
        <path d="M32 52C16 40 10 31 12 22c2-9 14-11 20-2 6-9 18-7 20 2 2 9-4 18-20 30Z" />
        <path d="M32 43c-8-7-12-12-12-17 0-5 7-6 12 0 5-6 12-5 12 0 0 5-4 10-12 17Z" />
      </svg>
    );
  }

  if (id === "stationery") {
    return (
      <svg viewBox="0 0 64 64" className={common} aria-hidden="true">
        <path d="M14 13h27v38H14V13Z" />
        <path d="M21 21h13M21 28h13M21 35h9M45 43l9-28 5 2-9 28-7 6 2-8Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" className={common} aria-hidden="true">
      <path d="m32 8 7 15 17 2-12 12 3 17-15-8-15 8 3-17L8 25l17-2 7-15Z" />
    </svg>
  );
}

function StudentIllustration() {
  return (
    <svg viewBox="0 0 390 220" aria-hidden="true" className="mkt-students-svg">
      <g fill="none" stroke="#123b83" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5">
        {/* Student 1: headphones + backpack */}
        <path d="M42 86c0-31 15-50 40-50 26 0 42 20 42 51" />
        <path d="M49 83c-10-2-17 6-16 17 1 10 8 16 18 14M116 83c10-2 17 6 16 17-1 10-8 16-18 14" />
        <path d="M53 77c4-24 17-36 32-36 16 0 28 13 31 36" />
        <ellipse cx="83" cy="79" rx="27" ry="31" fill="#fffaf0" />
        <path d="M61 62c8-16 28-21 44-11M68 82h1M94 82h1M72 96c7 7 15 7 22 0" />
        <path d="M48 191c3-50 14-78 36-78 23 0 36 28 40 78" fill="#f47b3f" />
        <path d="M57 125c-14 13-21 32-22 57M111 126c16 13 25 31 28 56" />
        <path d="M46 143c-17 4-25 20-21 38M121 141c16 5 24 18 24 37" />
        <path d="M57 129c-13 8-19 20-21 35M109 129c12 9 18 20 20 35" strokeWidth="3.5" />

        {/* Student 2: long hair + notebook */}
        <ellipse cx="196" cy="82" rx="25" ry="29" fill="#fffaf0" />
        <path d="M172 77c0-26 13-42 32-42 18 0 32 17 31 44M174 63c7-17 24-24 43-15" />
        <path d="M181 83h1M205 83h1M184 96c6 6 14 6 20 0" />
        <path d="M162 191c3-49 14-79 35-79 21 0 34 30 37 79" fill="#fffaf0" />
        <path d="M166 126c-13 10-21 26-23 50M226 127c14 12 21 28 23 49" />
        <path d="M178 143h42v31h-42z" fill="#fffaf0" />
        <path d="M185 151h27M185 158h24M185 165h18" strokeWidth="3" />

        {/* Student 3: ponytail + shoulder bag */}
        <ellipse cx="306" cy="79" rx="26" ry="30" fill="#fffaf0" />
        <path d="M282 73c1-25 14-39 33-39 17 0 30 14 32 35M286 58c8-15 25-21 42-12" />
        <path d="M332 47c20 3 28 15 24 31M291 80h1M316 80h1M294 95c7 6 15 6 22 0" />
        <path d="M269 191c4-49 17-79 38-79 22 0 36 30 40 79" fill="#fffaf0" />
        <path d="M276 129c-15 12-23 27-25 48M338 130c15 12 22 28 24 47" />
        <path d="M326 121c11 16 17 36 19 61" strokeWidth="3.5" />
        <path d="M338 154c14 1 24 9 28 23" />
      </g>

      <g fill="none" stroke="#f15b32" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4.5">
        <path d="M14 58l15 7M19 43l7 13M359 57l15-10M363 72l18 1" />
        <path d="M245 60c8-15 19-14 23-5 4-10 15-10 19-1 4 12-9 21-20 29-11-8-24-14-22-23Z" />
        <path d="M351 112c7-13 17-12 20-4 3-8 13-9 16-1 4 10-7 18-16 25-9-6-21-12-20-20Z" />
      </g>

      <g fill="#f47b3f" stroke="#123b83" strokeWidth="3">
        <path d="M38 133c8-7 14-8 21-4l-2 18-20 0 1-14Z" />
      </g>
    </svg>
  );
}

function Doodle({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`mkt-doodle ${className}`} aria-hidden="true">{children}</span>;
}

function DemoLogo({ index, name }: { index: number; name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("");

  return <span className={`mkt-demo-logo mkt-demo-logo-${index % 6}`}>{initials}</span>;
}

function StoreCard({
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
  const demo = "demoRating" in store ? (store as DemoMarketplaceStore) : null;
  const tags = demo?.demoTags ?? [inferredCategory(store)];
  const rating = demo?.demoRating ?? null;
  const reviewCount = demo?.demoReviewCount ?? null;

  const body = (
    <article className={`mkt-store-card mkt-store-card-${index}`}>
      <div className="mkt-store-photo">
        {store.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.coverUrl} alt="" />
        ) : (
          <div className="mkt-store-photo-fallback">TIENDA</div>
        )}
        <div className={`mkt-store-ribbon mkt-store-ribbon-${index}`}>
          {index === 0 ? "POSTRES" : index === 1 ? "SNACK LAB" : index === 2 ? "TORTAS EL PUNTO" : index === 3 ? "Café del Campus" : index === 4 ? "Artesanías Morelia" : "PAPELERÍA EXPRESS"}
        </div>
      </div>

      <div className="mkt-store-copy">
        <div className="mkt-store-logo">
          {store.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.logoUrl} alt="" />
          ) : (
            <DemoLogo index={index} name={store.name} />
          )}
        </div>
        <div className="mkt-store-copy-main">
          <h3>{store.name}</h3>
          <p>{store.description || "Conoce esta tienda y lo que ofrece."}</p>
          <div className="mkt-store-details">
            {rating !== null && reviewCount !== null && (
              <span className="mkt-rating"><b>★</b> {rating.toFixed(1)} ({reviewCount})</span>
            )}
            {tags.map((tag) => (
              <span key={tag} className="mkt-tag">{tag}</span>
            ))}
          </div>
          {store.deliveryLocation && (
            <div className="mkt-store-location"><PinIcon /> {store.deliveryLocation}</div>
          )}
        </div>
      </div>

      <div className={`mkt-hand-note mkt-hand-note-${index}`}>{CARD_NOTES[index] ?? ""}</div>
    </article>
  );

  const className = `mkt-store-slot mkt-store-slot-${index}`;

  if (previewMode) {
    return (
      <button type="button" className={className} onClick={() => onPreview(store)} aria-label={`Previsualizar ${store.name}`}>
        {body}
      </button>
    );
  }

  return (
    <Link href={`/marketplace/stores/${store.slug}`} className={className}>
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
  const [forceDemo, setForceDemo] = useState(false);

  useEffect(() => {
    setForceDemo(new URLSearchParams(window.location.search).get("visual") === "1");
  }, []);

  useEffect(() => {
    const visualPreview = new URLSearchParams(window.location.search).get("visual") === "1";
    if (visualPreview) {
      setForceDemo(true);
      setLoading(false);
      setError("");
      return;
    }

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

  const effectiveLoading = forceDemo ? false : loading;
  const effectiveError = forceDemo ? "" : error;
  const previewMode = forceDemo || (!loading && !error && liveStores.length === 0);
  const sourceStores: PublicStoreSummary[] = previewMode ? DEMO_MARKETPLACE_STORES : liveStores;
  const normalizedQuery = query.trim().toLocaleLowerCase("es-MX");

  const filteredStores = useMemo(() => {
    return sourceStores.filter((store) => {
      const categoryMatch = category === "all" || inferredCategory(store) === category;
      const queryMatch =
        !normalizedQuery ||
        [store.name, store.description, store.deliveryLocation]
          .filter(Boolean)
          .some((value) => value.toLocaleLowerCase("es-MX").includes(normalizedQuery));

      return categoryMatch && queryMatch;
    });
  }, [category, normalizedQuery, sourceStores]);

  const featured = filteredStores.slice(0, 6);

  return (
    <main className="mkt-page">
      <section className="mkt-approved-canvas" aria-label="Mercadito Tec">
        <div className="mkt-market-photo" aria-hidden="true">
          <div className="mkt-market-photo-shade" />
        </div>
        <div className="mkt-bunting" aria-hidden="true">
          <span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span />
        </div>

        <div className="mkt-title-paper">
          <h1>
            Tiendas de la
            <strong>comunidad</strong>
          </h1>
          <p>COMIDA · BEBIDAS · ARTESANÍAS<br />PAPELERÍA · Y MUCHO MÁS</p>
        </div>

        <div className="mkt-pink-note">Apoya<br />compra<br />disfruta<br />conecta<br /><b>☺</b></div>
        <div className="mkt-blue-note">PEQUEÑOS<br />NEGOCIOS<br /><strong>GRANDES<br />HISTORIAS</strong><br />♡</div>
        <div className="mkt-orange-note">HECHO<br />POR<br />ESTUDIANTES<br />COMO TÚ<br />☺</div>

        <Doodle className="mkt-rays-left">❯❯</Doodle>
        <Doodle className="mkt-heart-title">♡</Doodle>
        <Doodle className="mkt-rays-search">///</Doodle>

        <div className="mkt-campus-photo" aria-hidden="true" />
        <div className="mkt-campus-note">UN CAMPUS<br />LLENO DE<br />TALENTO ☺</div>

        <form className="mkt-search" onSubmit={(event) => event.preventDefault()}>
          <SearchIcon />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Busca comida, bebidas, papelería, artesanías..."
            aria-label="Buscar tiendas"
          />
          <button type="submit">Buscar</button>
        </form>

        <div className="mkt-category-strip" aria-label="Categorías">
          {CATEGORY_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={category === item.id ? "mkt-category-button is-active" : "mkt-category-button"}
              onClick={() => setCategory(item.id)}
            >
              <span className="mkt-category-icon-wrap"><CategoryIcon id={item.id} /></span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="mkt-students-art">
          <StudentIllustration />
          <div className="mkt-students-note">MISMAS<br />IDEAS<br /><strong>MÁS<br />COMUNIDAD</strong></div>
        </div>

        <div className="mkt-featured-heading">
          <span className="mkt-featured-brush" aria-hidden="true" />
          <h2>Tiendas destacadas</h2>
          <span className="mkt-star" aria-hidden="true">☆</span>
        </div>

        {effectiveLoading && <div className="mkt-canvas-message">Cargando tiendas…</div>}
        {!effectiveLoading && effectiveError && <div className="mkt-canvas-message mkt-canvas-error">{effectiveError}</div>}
        {!effectiveLoading && !effectiveError && featured.length === 0 && (
          <div className="mkt-canvas-message">No encontramos coincidencias.</div>
        )}

        {!effectiveLoading && !effectiveError && (
          <>
            <div className="mkt-bottom-blue">
              <div className="mkt-bottom-blue-photo" />
              <div className="mkt-bottom-blue-copy">MÁS ESTUDIANTES<br />MÁS HISTORIAS</div>
              <span className="mkt-bottom-heart">♡</span>
            </div>

            <div className="mkt-bottom-campus" aria-hidden="true" />

            {featured.map((store, index) => (
              <StoreCard
                key={store.id}
                store={store}
                index={index}
                previewMode={previewMode}
                onPreview={setPreviewStore}
              />
            ))}

            <div className="mkt-discover-note" aria-hidden="true">DESCUBRE <span>→</span></div>
            <div className="mkt-future-note">AQUÍ<br />TAMBIÉN SE<br />CONSTRUYE<br />EL FUTURO<br />☺</div>
          </>
        )}

        <Doodle className="mkt-squiggle-a">∿</Doodle>
        <Doodle className="mkt-squiggle-b">⌁</Doodle>
        <Doodle className="mkt-squiggle-c">♡</Doodle>
        <Doodle className="mkt-squiggle-d">✦</Doodle>
      </section>

      {previewStore && (
        <div className="mkt-modal-backdrop" onMouseDown={() => setPreviewStore(null)}>
          <section className="mkt-modal" role="dialog" aria-modal="true" aria-labelledby="mkt-preview-title" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="mkt-modal-close" onClick={() => setPreviewStore(null)} aria-label="Cerrar">×</button>
            {previewStore.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewStore.coverUrl} alt="" className="mkt-modal-cover" />
            )}
            <div className="mkt-modal-body">
              <span>TIENDA DEMO</span>
              <h2 id="mkt-preview-title">{previewStore.name}</h2>
              <p>{previewStore.description}</p>
              <p className="mkt-modal-place"><PinIcon /> {previewStore.deliveryLocation}</p>
              <p className="mkt-modal-help">Esta tienda existe únicamente para previsualizar la interfaz aprobada.</p>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
