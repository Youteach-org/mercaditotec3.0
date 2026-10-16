"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CategoryIcon from "@/components/store/CategoryIcon";
import type { CategoryIconKey } from "@/lib/store/categoryIcon";
import type { DiscoverProduct } from "@/lib/store/discoverFeed";
import { useSession } from "@/lib/useSession";
import "./descubre.css";

interface DiscoverCategory {
  id: string;
  name: string;
  iconKey: CategoryIconKey;
}

const BATCH_SIZE = 12;

function priceLabel(product: DiscoverProduct): string {
  if (product.priceType === "ask" || product.priceAmount === null) return "Pregunta precio";
  const formatted = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(product.priceAmount);
  return product.priceType === "negotiable" ? formatted + " · negociable" : formatted;
}

function hasActiveOffer(product: DiscoverProduct): boolean {
  return Boolean(product.flashEndsAt && Date.parse(product.flashEndsAt) > Date.now());
}

function SearchMark() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>;
}

function ProductCard({ product, index }: { product: DiscoverProduct; index: number }) {
  const href = "/marketplace/stores/" + encodeURIComponent(product.storeSlug)
    + "#producto-" + encodeURIComponent(product.id);
  return (
    <article className={"discover-product discover-product-" + (index % 8)}>
      <div className="discover-product-tape" aria-hidden="true" />
      <Link href={href} prefetch={false} className="discover-product-link" aria-label={"Ver " + product.title + " en " + product.storeName}>
        <div className="discover-product-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.imageUrl} alt={product.title} loading={index > 3 ? "lazy" : "eager"} />
        </div>
        {hasActiveOffer(product) && <span className="discover-product-flash">⚡ ¡Flash!</span>}
        <div className="discover-product-copy">
          <h2>{product.title}</h2>
          {product.description && <p>{product.description}</p>}
          <span className="discover-product-price">{priceLabel(product)}</span>
        </div>
      </Link>
      <div className="discover-product-meta">
        <span className="discover-seller">
          {product.storeLogoUrl
            ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={product.storeLogoUrl} alt="" loading="lazy" />
            : <span className="discover-seller-icon" aria-hidden="true">▣</span>}
          <span>{product.storeName}</span>
        </span>
        {product.deliveryLocation && <span className="discover-location"><span aria-hidden="true">⌖</span>{product.deliveryLocation}</span>}
      </div>
    </article>
  );
}

export default function DescubrePage() {
  const router = useRouter();
  const { firebaseUser, loading: sessionLoading } = useSession();
  const [products, setProducts] = useState<DiscoverProduct[]>([]);
  const [categories, setCategories] = useState<DiscoverCategory[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [limit, setLimit] = useState(BATCH_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [publishModal, setPublishModal] = useState(false);

  useEffect(() => {
    if (!sessionLoading && !firebaseUser) router.replace("/login");
  }, [sessionLoading, firebaseUser, router]);

  useEffect(() => {
    if (sessionLoading || !firebaseUser) return;
    const controller = new AbortController();
    void firebaseUser.getIdToken()
      .then((token) => fetch("/api/descubre", {
        signal: controller.signal,
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      }))
      .then(async (response) => {
        if (!response.ok) throw new Error("No se pudieron cargar los productos.");
        return response.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        setProducts(Array.isArray(data.products) ? data.products : []);
        setCategories(Array.isArray(data.categories) ? data.categories : []);
        setLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setError("No se pudieron cargar los productos. Vuelve a intentarlo.");
        setLoading(false);
      });
    return () => controller.abort();
  }, [sessionLoading, firebaseUser]);

  const visibleCategories = useMemo(
    () => categories.filter((cat) => products.some((product) => product.categoryId === cat.id)),
    [categories, products],
  );
  const matching = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es-MX");
    return products.filter((product) => {
      if (filter === "offers" && !hasActiveOffer(product)) return false;
      if (filter !== "all" && filter !== "offers" && product.categoryId !== filter) return false;
      if (!query) return true;
      return (product.title + " " + product.description + " " + product.storeName)
        .toLocaleLowerCase("es-MX").includes(query);
    });
  }, [products, search, filter]);
  const shown = matching.slice(0, limit);

  if (sessionLoading || !firebaseUser) {
    return <main className="discover-page discover-loading" aria-busy="true">Cargando Mercadito…</main>;
  }

  return (
    <main className="discover-page">
      <div className="discover-paper-top" aria-hidden="true" />
      <div className="discover-inner">
        <section className="discover-hero" aria-label="Explora los productos de Mercadito">
          <div className="discover-hero-title">
            <h1>Descubre<span className="discover-hero-rays" aria-hidden="true">✳</span></h1>
            <p>Productos increíbles<br />de nuestra comunidad</p>
          </div>
          <form className="discover-search" onSubmit={(event) => event.preventDefault()} role="search">
            <SearchMark />
            <input
              type="search"
              aria-label="Buscar productos"
              placeholder="¿Qué se te antoja hoy?"
              value={search}
              maxLength={100}
              onChange={(event) => { setSearch(event.target.value); setLimit(BATCH_SIZE); }}
            />
          </form>
          <button type="button" className="discover-publish" onClick={() => setPublishModal(true)}>
            <span aria-hidden="true">＋</span> Publicar
          </button>
          <div className="discover-hero-note" aria-hidden="true">Encuentra, compra<br />y apoya a la comunidad ↗</div>
        </section>

        <nav className="discover-filters" aria-label="Filtrar productos">
          <button type="button" className={filter === "all" ? "is-active" : ""} onClick={() => { setFilter("all"); setLimit(BATCH_SIZE); }}>▦ Todos</button>
          <button type="button" className={filter === "offers" ? "is-active" : ""} onClick={() => { setFilter("offers"); setLimit(BATCH_SIZE); }}>⚡ Ofertas</button>
          {visibleCategories.map((category) => (
            <button key={category.id} type="button" className={filter === category.id ? "is-active" : ""} onClick={() => { setFilter(category.id); setLimit(BATCH_SIZE); }}>
              <CategoryIcon id={category.iconKey} /> {category.name}
            </button>
          ))}
        </nav>

        <div className="discover-intro">
          <p>Descubre productos<br />de la comunidad <span aria-hidden="true">♡</span></p>
          <Link href="/marketplace" prefetch={false}>Ver tiendas <span aria-hidden="true">↗</span></Link>
        </div>

        {loading ? (
          <div className="discover-empty" role="status">Buscando cosas increíbles…</div>
        ) : error ? (
          <div className="discover-empty" role="alert">{error}</div>
        ) : matching.length === 0 ? (
          <div className="discover-empty">
            <h2>{search || filter !== "all" ? "No encontramos coincidencias" : "Pronto descubrirás más productos"}</h2>
            <p>{search || filter !== "all" ? "Prueba otra búsqueda o explora todas las categorías." : "Las publicaciones nuevas aparecerán aquí después de superar la revisión de seguridad."}</p>
            <Link href="/marketplace">Mientras tanto, conoce las tiendas →</Link>
          </div>
        ) : (
          <>
            <section className="discover-wall" aria-label="Productos de nuestra comunidad">
              {shown.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </section>
            {matching.length > shown.length && (
              <button type="button" className="discover-more" onClick={() => setLimit((value) => value + BATCH_SIZE)}>
                Ver más productos <span aria-hidden="true">↓</span>
              </button>
            )}
          </>
        )}

        <div className="discover-end-doodle" aria-hidden="true">
          <span>Compra local ♥<br />Apoya a nuestra comunidad</span>
          <span>✰　✧　↝</span>
        </div>
      </div>

      {publishModal && (
        <div className="discover-dialog-backdrop" role="presentation" onMouseDown={() => setPublishModal(false)}>
          <section className="discover-dialog" role="dialog" aria-modal="true" aria-labelledby="discover-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" aria-label="Cerrar" className="discover-dialog-close" onClick={() => setPublishModal(false)}>×</button>
            <span className="discover-dialog-illustration" aria-hidden="true">✦</span>
            <h2 id="discover-dialog-title">Publicaciones seguras</h2>
            <p>Estamos habilitando la revisión automática de fotografías y descripciones. Los anuncios nuevos no se mostrarán sin pasar ese control.</p>
            <button type="button" onClick={() => setPublishModal(false)}>Entendido</button>
          </section>
        </div>
      )}
    </main>
  );
}
