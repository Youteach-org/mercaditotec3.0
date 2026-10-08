"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import StoreScheduleGrid from "@/components/store/StoreScheduleGrid";
import { createOrderRequest } from "@/lib/orders/client";
import type { PublicStoreDetail } from "@/lib/store/publicMarketplace";
import { useSession } from "@/lib/useSession";

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
      fill="currentColor"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.966-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.149-.173.198-.297.298-.496.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.009-.371-.011-.57-.011-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479s1.065 2.875 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.981.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.029 6.988 2.895a9.825 9.825 0 0 1 2.9 6.988c-.003 5.45-4.437 9.884-9.892 9.884m8.413-18.297A11.815 11.815 0 0 0 12.055 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.14 1.588 5.945L.056 24l6.305-1.654a11.882 11.882 0 0 0 5.689 1.448h.005c6.559 0 11.894-5.335 11.896-11.893a11.821 11.821 0 0 0-3.487-8.413" />
    </svg>
  );
}

function priceLabel(storeProduct: PublicStoreDetail["products"][number]): string {
  if (storeProduct.priceType === "ask") return "Pregunta por el precio";
  if (storeProduct.priceAmount === null) return "Precio no disponible";
  const amount = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(storeProduct.priceAmount);
  return storeProduct.priceType === "negotiable" ? `${amount} · negociable` : amount;
}

export default function PublicStorePage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { firebaseUser, loading: sessionLoading } = useSession();
  const slug = String(params.slug ?? "");
  const [store, setStore] = useState<PublicStoreDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  useEffect(() => {
    if (sessionLoading) return;
    if (!firebaseUser) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    setLoading(true);

    void firebaseUser.getIdToken().then((token) => fetch(`/api/marketplace/stores/${encodeURIComponent(slug)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }))
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "No se pudo cargar la tienda.");
        if (!cancelled) setStore(data.store as PublicStoreDetail);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la tienda.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, firebaseUser, sessionLoading, router]);

  async function requestProduct(productId: string) {
    if (!store) return;
    if (!firebaseUser) {
      router.push("/login");
      return;
    }

    setSubmittingId(productId);
    setFeedback((current) => ({ ...current, [productId]: "" }));

    try {
      await createOrderRequest(firebaseUser, {
        storeId: store.id,
        productId,
        quantity: quantities[productId] ?? 1,
        note: notes[productId] ?? "",
      });
      setFeedback((current) => ({
        ...current,
        [productId]: "Solicitud enviada. Puedes seguirla en Mis pedidos.",
      }));
      setNotes((current) => ({ ...current, [productId]: "" }));
    } catch (submitError) {
      setFeedback((current) => ({
        ...current,
        [productId]: submitError instanceof Error ? submitError.message : "No se pudo enviar la solicitud.",
      }));
    } finally {
      setSubmittingId(null);
    }
  }

  if (sessionLoading || !firebaseUser || loading) {
    return <main className="min-h-screen bg-slate-100 p-5">Cargando tienda...</main>;
  }

  if (error || !store) {
    return (
      <main className="min-h-screen bg-slate-100 p-5">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-7 shadow-sm">
          <Link href="/marketplace" className="text-sm font-black text-emerald-700">← Volver al Mercadito</Link>
          <h1 className="mt-5 text-2xl font-black text-slate-950">Tienda no disponible</h1>
          <p className="mt-2 text-slate-600">{error || "Esta tienda no está disponible públicamente."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 sm:px-6 sm:py-7">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/marketplace" className="inline-flex text-sm font-black text-emerald-700 hover:underline">
            ← Volver al Mercadito
          </Link>
          <Link href="/orders" className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-800 shadow-sm hover:bg-slate-50">
            Mis pedidos
          </Link>
        </div>

        <header className="overflow-hidden rounded-3xl bg-white shadow-lg">
          <div className="relative h-44 bg-gradient-to-br from-slate-900 to-slate-600 sm:h-60">
            {store.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={store.coverUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl" aria-hidden="true">🏬</div>
            )}
          </div>

          <div className="p-5 sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="relative z-10 -mt-14 h-24 w-24 shrink-0 overflow-hidden rounded-3xl border-4 border-white bg-slate-100 shadow-md">
                {store.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={store.logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl" aria-hidden="true">🛍️</div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-black text-slate-950">{store.name}</h1>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${store.openNow ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                    {store.openNow ? "Abierta ahora" : "Cerrada ahora"}
                  </span>
                </div>
                <p className="mt-3 max-w-3xl leading-relaxed text-slate-600">{store.description || "Sin descripción."}</p>
                {store.deliveryLocation && (
                  <p className="mt-4 font-semibold text-slate-800">📍 Entrega: {store.deliveryLocation}</p>
                )}
                {store.whatsappUrl && (
                  <a
                    href={store.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Contactar por WhatsApp"
                    title="Contactar por WhatsApp"
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-3.5 py-2 text-sm font-black text-white shadow-sm transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
                  >
                    <WhatsAppIcon />
                    <span>Contactar</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </header>

        <section className={store.products.length === 1
          ? "grid gap-6 lg:grid-cols-2 lg:items-start"
          : "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(350px,440px)] lg:items-start"}>
          <div className="min-w-0">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.14em] text-emerald-700">Catálogo</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">Productos</h2>
              </div>
              <span className="text-sm font-semibold text-slate-500">{store.products.length} producto(s)</span>
            </div>

            {store.products.length === 0 ? (
              <div className="rounded-3xl bg-white p-6 text-slate-600 shadow-sm">
                Esta tienda todavía no tiene productos publicados.
              </div>
            ) : (
              <div className={`grid gap-4 ${store.products.length === 1 ? "grid-cols-1" : "sm:grid-cols-2"}`}>
                {store.products.map((product) => (
                  <article key={product.id} className="overflow-hidden rounded-3xl bg-white shadow-sm">
                    <div className={store.products.length === 1 ? "h-56 bg-slate-100 sm:h-72" : "h-48 bg-slate-100 sm:h-56"}>
                      {product.imageUrls[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.imageUrls[0]} alt={product.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-4xl" aria-hidden="true">📦</div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="text-xl font-black text-slate-950">{product.title}</h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">{product.description}</p>
                      <p className="mt-4 text-lg font-black text-emerald-700">{priceLabel(product)}</p>

                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <div className="flex items-center gap-3">
                          <label className="text-sm font-bold text-slate-700" htmlFor={`qty-${product.id}`}>Cantidad</label>
                          <select
                            id={`qty-${product.id}`}
                            value={quantities[product.id] ?? 1}
                            onChange={(event) => setQuantities((current) => ({
                              ...current,
                              [product.id]: Number(event.target.value),
                            }))}
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900"
                          >
                            {Array.from({ length: 20 }, (_, index) => index + 1).map((quantity) => (
                              <option key={quantity} value={quantity}>{quantity}</option>
                            ))}
                          </select>
                        </div>

                        <textarea
                          value={notes[product.id] ?? ""}
                          onChange={(event) => setNotes((current) => ({
                            ...current,
                            [product.id]: event.target.value.slice(0, 500),
                          }))}
                          placeholder="Nota opcional para el vendedor"
                          rows={2}
                          className="mt-3 w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                        />

                        <button
                          type="button"
                          disabled={submittingId === product.id}
                          onClick={() => void requestProduct(product.id)}
                          className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {submittingId === product.id ? "Enviando..." : "Solicitar"}
                        </button>

                        {feedback[product.id] && (
                          <p className="mt-2 text-sm font-semibold text-slate-600">{feedback[product.id]}</p>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className="h-fit min-w-0 rounded-3xl bg-white p-4 shadow-sm sm:p-5 lg:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-black text-slate-950">Horario de atención</h2>
              {store.operationalMode === "manual" && (
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${store.openNow ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                  {store.openNow ? "Abierta temporalmente" : "Pausada temporalmente"}
                </span>
              )}
            </div>

            <p className="mt-1 text-xs font-medium text-slate-500">Horario habitual · 7 a. m. a 9 p. m.</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-700">
              <span className="inline-flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded border border-blue-700 bg-blue-600" aria-hidden="true" />
                Disponible
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded border border-slate-200 bg-white" aria-hidden="true" />
                No disponible
              </span>
            </div>

            <div className="mt-3 min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-2 sm:p-3">
              <StoreScheduleGrid schedule={store.schedule} publicView />
            </div>
            {store.operationalMode === "manual" && (
              <p className="mt-3 text-xs leading-relaxed text-slate-600">
                El estado temporal de la tienda puede ser distinto al horario semanal mostrado.
              </p>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}
