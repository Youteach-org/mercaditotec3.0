"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CategoryIcon from "@/components/store/CategoryIcon";
import type { CategoryIconKey } from "@/lib/store/categoryIcon";
import type { DiscoverFeedItem } from "@/lib/descubre/feed";
import DiscoverProductCard, { isFlash } from "@/components/descubre/DiscoverProductCard";
import { useSession } from "@/lib/useSession";
import "./descubre.css";

interface DiscoverCategory {
  id: string;
  name: string;
  iconKey: CategoryIconKey;
}

const BATCH_SIZE = 12;

function SearchMark() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>;
}

export default function DescubrePage() {
  const router = useRouter();
  const { firebaseUser, loading: sessionLoading } = useSession();
  const [products, setProducts] = useState<DiscoverFeedItem[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<number | null>(null);
  const [categories, setCategories] = useState<DiscoverCategory[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [limit, setLimit] = useState(BATCH_SIZE);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  // Reuse the same five-minute cached community counter formerly requested
  // by the Tiendas page. Never query individual profiles from the browser.
  useEffect(() => {
    if (sessionLoading || !firebaseUser) {
      setRegisteredUsers(null);
      return;
    }
    const controller = new AbortController();
    void firebaseUser.getIdToken()
      .then((token) => fetch("/api/community-stats", {
        signal: controller.signal,
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      }))
      .then(async (response) => {
        if (!response.ok) throw new Error("Contador no disponible");
        return response.json();
      })
      .then((data: { registeredUsers?: unknown }) => {
        if (controller.signal.aborted) return;
        setRegisteredUsers(
          typeof data.registeredUsers === "number" &&
          Number.isSafeInteger(data.registeredUsers) && data.registeredUsers >= 0
            ? data.registeredUsers : null,
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) setRegisteredUsers(null);
      });
    return () => controller.abort();
  }, [sessionLoading, firebaseUser]);

  // Show ALL active real categories, even before the first product arrives.
  // The Marketplace category strip is the visual reference; no generic pills.
  const visibleCategories = useMemo(
    () => categories.filter((cat) => cat.id && cat.name).slice(0, 24),
    [categories],
  );
  // Time-limited products disappear without fetching from Firebase every minute.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const matching = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es-MX");
    return products.filter((product) => {
      if ("personal" in product && product.personal && product.expiresAt <= now) return false;
      if (filter === "offers" && !isFlash(product, now)) return false;
      if (filter !== "all" && filter !== "offers" && product.categoryId !== filter) return false;
      if (!query) return true;
      return (product.title + " " + product.description + " " + product.storeName)
        .toLocaleLowerCase("es-MX").includes(query);
    });
  }, [products, search, filter, now]);
  const shown = matching.slice(0, limit);
  // The count covers products actually available in the current Descubre wall:
  // storefront products plus approved unexpired individual listings, not shops.
  // It comes from the feed already loaded, with zero additional DB queries.
  // Personal listings count down locally when their expiry is reached.
  const discoverProductCount = useMemo(() => products.filter((item) =>
    !("personal" in item && item.personal) || item.expiresAt > now,
  ).length, [products, now]);

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
          <Link href="/descubre/publicar" className="discover-publish">
            <span aria-hidden="true">＋</span> Publicar
          </Link>
        </section>

        {!loading && !error && (
          <section className="discover-community-stats" aria-label="Cifras de la comunidad">
            {registeredUsers !== null && (
              <div className="discover-community-stat discover-community-stat-people">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="9" cy="8" r="3" />
                  <path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M19 14a5 5 0 0 1 2 4v2" />
                </svg>
                <strong>{registeredUsers.toLocaleString("es-MX")}</strong>
                <span>Personas</span>
              </div>
            )}
            <div className="discover-community-stat discover-community-stat-products">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 6h16v14H4zM4 10h16M9 6v14M8 4h8M15 13l2 2-2 2" />
              </svg>
              <strong>{discoverProductCount.toLocaleString("es-MX")}</strong>
              <span>Productos</span>
            </div>
          </section>
        )}

        <section className="discover-category-section" aria-label="Explora por categoría">
          <div className="discover-category-heading">
            <span className="discover-category-brush" aria-hidden="true" />
            <h2>Explora</h2>
            <span className="discover-category-spark" aria-hidden="true">✳</span>
          </div>
          <nav className="discover-filters" aria-label="Filtrar productos">
            <button type="button" aria-pressed={filter === "all"} className={filter === "all" ? "discover-category-button is-active" : "discover-category-button"} onClick={() => { setFilter("all"); setLimit(BATCH_SIZE); }}>
              <span className="discover-category-icon"><CategoryIcon id="all" /></span>
              <span className="discover-category-label">Todas</span>
            </button>
            <button type="button" aria-pressed={filter === "offers"} className={filter === "offers" ? "discover-category-button is-active" : "discover-category-button"} onClick={() => { setFilter("offers"); setLimit(BATCH_SIZE); }}>
              <span className="discover-category-icon discover-category-flash" aria-hidden="true">ϟ</span>
              <span className="discover-category-label">Ofertas</span>
            </button>
            {visibleCategories.map((category) => (
              <button key={category.id} type="button" aria-pressed={filter === category.id} className={filter === category.id ? "discover-category-button is-active" : "discover-category-button"} onClick={() => { setFilter(category.id); setLimit(BATCH_SIZE); }}>
                <span className="discover-category-icon"><CategoryIcon id={category.iconKey} /></span>
                <span className="discover-category-label">{category.name}</span>
              </button>
            ))}
          </nav>
        </section>

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
                <DiscoverProductCard key={product.id} product={product} index={index} />
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


    </main>
  );
}
