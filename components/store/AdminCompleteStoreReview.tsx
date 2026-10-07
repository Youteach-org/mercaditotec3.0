"use client";

import { useMemo } from "react";

import MarketplaceCardEditorPreview from "@/components/store/MarketplaceCardEditorPreview";
import StoreScheduleGrid from "@/components/store/StoreScheduleGrid";
import StorefrontPreview from "@/components/store/StorefrontPreview";
import type { StoreCategoryApiRecord } from "@/lib/store/categoryClient";
import type { StoreApiRecord } from "@/lib/store/client";
import type { StoreProductApiRecord } from "@/lib/store/productClient";
import { STORE_WEEK_DAYS } from "@/lib/store/schedule";

export interface AdminReviewOwner {
  uid: string;
  nickname: string;
  displayName: string;
  email: string;
  studentStatus: "pending" | "verified" | "revoked";
  endorsementCount: number;
}

interface Props {
  store: StoreApiRecord;
  products: StoreProductApiRecord[];
  categories: StoreCategoryApiRecord[];
  owner: AdminReviewOwner | null;
}

function priceLabel(product: StoreProductApiRecord): string {
  if (product.priceType === "ask") return "Precio: consultar con vendedor";
  const price = "$" + Number(product.priceAmount ?? 0).toFixed(2) + " MXN";
  return product.priceType === "negotiable" ? price + " · negociable" : price + " · fijo";
}

function dateLabel(value: string | null | undefined): string {
  if (!value) return "Sin registrar";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("es-MX");
}

function DataField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 border-b border-gray-100 pb-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 break-words whitespace-pre-wrap text-sm font-semibold text-gray-900">
        {value || "Sin registrar"}
      </dd>
    </div>
  );
}

export default function AdminCompleteStoreReview({
  store, products, categories, owner,
}: Props) {
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const classification = useMemo(() => {
    const approved = new Set<string>();
    const suggested = new Set<string>();
    const unclassified: string[] = [];

    for (const product of products) {
      if (product.suggestedCategoryName?.trim()) {
        suggested.add(product.suggestedCategoryName.trim());
      }
      const registered = categoryById.get(product.categoryId);
      if (registered) {
        approved.add(registered.name + (registered.active ? "" : " (inactiva)"));
      } else if (!product.suggestedCategoryName?.trim()) {
        unclassified.push(product.title);
      }
    }

    return {
      approved: [...approved],
      suggested: [...suggested],
      unclassified,
    };
  }, [products, categoryById]);

  const weekDaysLabel: Record<string, string> = {
    monday: "Lunes", tuesday: "Martes", wednesday: "Miércoles",
    thursday: "Jueves", friday: "Viernes", saturday: "Sábado", sunday: "Domingo",
  };

  const ownerName = owner?.nickname || owner?.displayName || owner?.email || store.ownerUid;
  const published = products.filter((product) => product.visibility === "published").length;
  const images = products.reduce((count, product) => count + product.imageUrls.length, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm sm:p-6">
        <div className="text-xs font-black uppercase tracking-widest text-amber-900">
          Paso 1 · Revisar clasificación
        </div>
        <h2 className="mt-1 text-2xl font-black text-gray-900">Categorías de la tienda y sus productos</h2>
        <p className="mt-2 text-sm text-gray-800">
          La clasificación comercial real proviene de los productos registrados, no de las
          etiquetas decorativas del Marketplace. Comprueba que corresponda a lo que realmente venden.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-amber-200 bg-white p-4">
            <h3 className="text-sm font-black text-gray-900">Categorías aprobadas registradas</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {classification.approved.length
                ? classification.approved.map((name) => (
                    <span key={name} className="rounded-lg border-2 border-amber-300 bg-amber-50 px-3 py-2 text-sm font-black text-amber-950">{name}</span>
                  ))
                : <span className="text-sm font-bold text-red-800">Sin categorías aprobadas vinculadas</span>}
            </div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-white p-4">
            <h3 className="text-sm font-black text-gray-900">Categorías propuestas por el vendedor</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {classification.suggested.length
                ? classification.suggested.map((name) => (
                    <span key={name} className="rounded-lg border-2 border-purple-300 bg-purple-50 px-3 py-2 text-sm font-black text-purple-900">{name}</span>
                  ))
                : <span className="text-sm text-gray-600">Ninguna categoría propuesta.</span>}
            </div>
          </div>
        </div>
        {classification.unclassified.length > 0 && (
          <p className="mt-3 rounded-lg bg-red-100 p-3 text-sm font-bold text-red-900">
            Productos sin categoría reconocida: {classification.unclassified.join(", ")}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold text-amber-950">
          <span>{products.length} productos registrados</span>
          <span>{published} publicados</span>
          <span>{images} fotografías de productos</span>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-black text-gray-900">Paso 2 · Vendedor y validación</h2>
          <dl className="mt-4 space-y-3">
            <DataField label="Usuario" value={ownerName} />
            <DataField label="Nombre del perfil" value={owner?.displayName} />
            <DataField label="Correo institucional" value={owner?.email} />
            <DataField label="Confirmación de alumno" value={
              owner?.studentStatus === "verified" ? "Alumno verificado" :
              owner?.studentStatus === "revoked" ? "Confirmación revocada" :
              "Pendiente de confirmar"
            } />
            <DataField label="Avales registrados" value={String(owner?.endorsementCount ?? 0) + " / 2"} />
            <DataField label="UID del propietario" value={store.ownerUid} />
          </dl>
        </article>

        <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-black text-gray-900">Paso 3 · Datos originales de la tienda</h2>
          <dl className="mt-4 space-y-3">
            <DataField label="Nombre comercial" value={store.name} />
            <DataField label="Descripción íntegra" value={store.description} />
            <DataField label="Lugar e instrucciones de entrega" value={store.deliveryLocation} />
            <DataField label="URL pública" value={
              store.slug ? "/marketplace/stores/" + store.slug : "Pendiente de aprobación"
            } />
            <DataField label="Creación" value={dateLabel(store.createdAt)} />
            <DataField label="Última edición" value={dateLabel(store.updatedAt)} />
            <DataField label="Solicitud enviada" value={dateLabel(store.submittedAt)} />
            <DataField label="Aprobación anterior" value={dateLabel(store.approvedAt)} />
            <DataField label="Suspensión anterior" value={dateLabel(store.suspendedAt)} />
            <DataField label="Correcciones solicitadas anteriormente" value={store.reviewMessage} />
            <DataField label="Motivo de suspensión" value={store.suspensionReason} />
          </dl>
        </article>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-black text-gray-900">Paso 4 · Portada y logo originales</h2>
        <p className="mt-1 text-sm text-gray-600">Toca cualquier imagen para verla completa, sin el recorte decorativo.</p>
        <div className="mt-4 grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div>
            <h3 className="mb-2 text-sm font-bold text-gray-700">Logo de la tienda</h3>
            {store.logoUrl
              ? <img src={store.logoUrl} alt={"Logo completo de " + store.name} className="h-56 w-full rounded-xl border border-gray-200 bg-gray-50 object-contain" />
              : <div className="flex h-56 items-center justify-center rounded-xl bg-gray-100 text-gray-500">Sin logo</div>}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-bold text-gray-700">Fotografía de portada</h3>
            {store.coverUrl
              ? <img src={store.coverUrl} alt={"Portada completa de " + store.name} className="h-56 w-full rounded-xl border border-gray-200 bg-gray-50 object-contain" />
              : <div className="flex h-56 items-center justify-center rounded-xl bg-gray-100 text-gray-500">Sin portada</div>}
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-black text-gray-900">Paso 5 · Horarios y operación</h2>
        <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold">
          <span className="rounded-lg bg-gray-100 px-3 py-2 text-gray-800">
            Modo: {store.operationalMode === "manual" ? "Manual" : "Automático"}
          </span>
          {store.operationalMode === "manual" && (
            <span className="rounded-lg bg-yellow-100 px-3 py-2 text-yellow-900">
              Estado manual: {store.manualOpen ? "Abierta" : "Cerrada"}
            </span>
          )}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)]">
          <div className="min-w-0 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <StoreScheduleGrid schedule={store.schedule} compact />
          </div>
          <div className="rounded-xl border border-gray-200 p-3">
            <h3 className="text-sm font-black text-gray-900">Horas seleccionadas por día</h3>
            <dl className="mt-3 space-y-2 text-sm">
              {STORE_WEEK_DAYS.map((day) => (
                <div key={day} className="border-b border-gray-100 pb-2">
                  <dt className="font-bold text-gray-800">{weekDaysLabel[day]}</dt>
                  <dd className="mt-0.5 break-words text-gray-600">
                    {store.schedule[day].slots.length
                      ? store.schedule[day].slots.join(", ")
                      : "Cerrado"}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-black text-gray-900">
          Paso 6 · Catálogo COMPLETO · {products.length} producto(s)
        </h2>
        <p className="mt-2 text-sm font-semibold text-gray-700">
          Se muestran TODOS los productos registrados, publicados y ocultos, con TODAS sus fotografías,
          descripción original, precio, categoría y estado. No se limita a un producto ni a los primeros 9.
        </p>
        {!products.length ? (
          <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-900">
            No hay ningún producto registrado. No apruebes hasta revisar el catálogo.
          </p>
        ) : (
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            {products.map((product, index) => {
              const registered = categoryById.get(product.categoryId);
              return (
                <article key={product.id} className="min-w-0 rounded-xl border-2 border-gray-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-lg font-black text-gray-900">
                      {index + 1}. {product.title || "Producto sin nombre"}
                    </h3>
                    <span className={
                      product.visibility === "published"
                        ? "rounded-lg bg-green-100 px-3 py-1 text-xs font-black text-green-900"
                        : "rounded-lg bg-gray-200 px-3 py-1 text-xs font-black text-gray-800"
                    }>
                      {product.visibility === "published" ? "Publicado" : "Oculto"}
                    </span>
                  </div>
                  <p className="mt-3 text-base font-black text-gray-900">{priceLabel(product)}</p>
                  <div className="mt-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-3 text-sm">
                    <div className="font-black text-amber-950">
                      Categoría aprobada: {registered?.name || "Sin categoría aprobada"}
                    </div>
                    {registered && !registered.active && (
                      <div className="font-bold text-red-800">Atención: la categoría está inactiva.</div>
                    )}
                    {product.suggestedCategoryName && (
                      <div className="mt-1 font-black text-purple-900">
                        Categoría propuesta: {product.suggestedCategoryName}
                      </div>
                    )}
                  </div>
                  <div className="mt-3">
                    <h4 className="text-xs font-bold uppercase text-gray-500">Descripción completa</h4>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-900">
                      {product.description || "Sin descripción."}
                    </p>
                  </div>
                  <h4 className="mt-4 text-xs font-black uppercase text-gray-700">
                    Todas las fotografías ({product.imageUrls.length})
                  </h4>
                  {product.imageUrls.length > 0
                    ? (
                      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {product.imageUrls.map((url, photoIndex) => (
                          <div key={url + ":" + photoIndex} className="min-w-0">
                            <img
                              src={url}
                              alt={product.title + " · fotografía " + (photoIndex + 1)}
                              className="h-36 w-full rounded-xl border border-gray-200 bg-gray-50 object-contain"
                            />
                            <div className="mt-1 text-center text-xs font-semibold text-gray-500">
                              Foto {photoIndex + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                    : <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-800">Sin fotografías</p>}
                  <div className="mt-4 grid gap-2 text-xs text-gray-500 sm:grid-cols-2">
                    <p>Creado: {dateLabel(product.createdAt)}</p>
                    <p>Actualizado: {dateLabel(product.updatedAt)}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-black text-gray-900">Paso 7 · Toda la personalización del Marketplace</h2>
        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <DataField label="Rótulo sobre la portada" value={store.marketplaceLabel} />
          <DataField label="Texto del post-it" value={store.marketplaceNote} />
          <DataField label="Forma seleccionada" value={store.marketplaceVariant} />
          <DataField label="Etiquetas decorativas (NO son categorías comerciales)" value={
            store.marketplaceTags.length ? store.marketplaceTags.join(" · ") : "Sin etiquetas"
          } />
          <DataField label="Lugar de entrega mostrado en tarjeta" value={store.deliveryLocation} />
        </dl>
        <details className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <summary className="cursor-pointer text-sm font-black text-gray-900">
            Mostrar la tarjeta decorativa tal como aparece en Mercadito
          </summary>
          <div className="mt-4">
            <MarketplaceCardEditorPreview
              storeId={store.id}
              name={store.name}
              description={store.description}
              deliveryLocation={store.deliveryLocation || ""}
              logoUrl={store.logoUrl}
              coverUrl={store.coverUrl}
              label={store.marketplaceLabel}
              note={store.marketplaceNote}
              tags={store.marketplaceTags}
              variant={store.marketplaceVariant || ""}
            />
          </div>
        </details>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-black text-gray-900">Vista previa de la página pública</h2>
        <p className="mt-2 text-sm text-gray-600">
          La vista comercial puede resumir los primeros productos; el catálogo íntegro,
          incluso los ocultos, está arriba en el paso 6.
        </p>
        <details className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <summary className="cursor-pointer text-sm font-black text-gray-900">
            Abrir vista previa de la tienda (PC)
          </summary>
          <div className="mt-5">
            <StorefrontPreview
              name={store.name}
              sellerName={ownerName}
              description={store.description}
              deliveryLocation={store.deliveryLocation || ""}
              logoUrl={store.logoUrl}
              coverUrl={store.coverUrl}
              schedule={store.schedule}
              products={products}
              previewMode="desktop"
            />
          </div>
        </details>
      </section>
    </div>
  );
}
