"use client";

import { useState } from "react";

import StoreScheduleGrid from "@/components/store/StoreScheduleGrid";
import type { StoreProductApiRecord } from "@/lib/store/productClient";
import type { StoreSchedule } from "@/lib/store/schedule";

interface Props {
  name: string;
  sellerName: string;
  description: string;
  deliveryLocation: string;
  logoUrl: string | null;
  coverUrl: string | null;
  schedule: StoreSchedule;
  products: StoreProductApiRecord[];
  compact?: boolean;
  previewMode?: "desktop" | "mobile";
}

function priceLabel(product: StoreProductApiRecord) {
  if (product.priceType === "ask") return "Preguntar";
  const amount = `$${Number(product.priceAmount ?? 0).toFixed(2)}`;
  return product.priceType === "negotiable" ? `${amount} · a tratar` : amount;
}

function ProductCard({ product, mobile }: { product: StoreProductApiRecord; mobile?: boolean }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {product.imageUrls[0] ? (
        <img
          src={product.imageUrls[0]}
          alt={product.title}
          className={mobile ? "h-28 w-full object-cover" : "h-32 w-full object-cover"}
        />
      ) : (
        <div className={mobile ? "flex h-28 items-center justify-center bg-slate-100 text-xs text-slate-400" : "flex h-32 items-center justify-center bg-slate-100 text-xs text-slate-400"}>
          Sin foto
        </div>
      )}
      <div className="p-3">
        <h4 className="line-clamp-1 text-sm font-black text-slate-900">{product.title}</h4>
        {product.description && (
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-500">{product.description}</p>
        )}
        <div className="mt-2 text-sm font-black text-blue-700">{priceLabel(product)}</div>
      </div>
    </article>
  );
}

function WhyChoose({ storeName }: { storeName: string }) {
  const label = storeName.trim() || "esta tienda";
  return (
    <div>
      <h3 className="text-xs font-black text-slate-900">Por qué elegir {label}</h3>
      <div className="mt-2 space-y-2 text-[10px] leading-snug text-slate-600">
        <div className="flex gap-2"><span aria-hidden="true">⚡</span><span><strong className="text-slate-800">Compra directa.</strong> Hablas con quien vende.</span></div>
        <div className="flex gap-2"><span aria-hidden="true">🎓</span><span><strong className="text-slate-800">Hecho por estudiantes.</strong> Apoyas a otro estudiante del Tec.</span></div>
        <div className="flex gap-2"><span aria-hidden="true">📍</span><span><strong className="text-slate-800">Entrega en campus.</strong> Recibes en los puntos indicados.</span></div>
      </div>
    </div>
  );
}

function StoreIdentity({
  name,
  sellerName,
  description,
  deliveryLocation,
  logoUrl,
}: Pick<Props, "name" | "sellerName" | "description" | "deliveryLocation" | "logoUrl">) {
  return (
    <>
      <div className="flex items-start gap-3 lg:block">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:h-24 lg:w-24">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo de la tienda" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-slate-400">Tu logo</span>
          )}
        </div>
        <div className="min-w-0 lg:mt-3">
          <h2 className="truncate text-2xl font-black text-slate-950">{name.trim() || "Nombre de tu tienda"}</h2>
          <p className="mt-0.5 text-xs font-bold text-blue-700">{sellerName || "Tu perfil"}</p>
          <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
            {description.trim() || "Explica brevemente qué vendes y qué encontrarán en tu tienda."}
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <div className="flex items-start gap-2">
          <span className="mt-0.5" aria-hidden="true">📍</span>
          <div>
            <h3 className="text-xs font-black text-slate-900">Entrego en</h3>
            <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-600">
              {deliveryLocation.trim() || "Indica en qué lugares del Tec entregas tus productos."}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default function StorefrontPreview({
  name,
  sellerName,
  description,
  deliveryLocation,
  logoUrl,
  coverUrl,
  schedule,
  products,
  compact = false,
  previewMode = "desktop",
}: Props) {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const visibleProducts = products.filter((product) => product.visibility === "published");
  const mobile = previewMode === "mobile" || compact;

  const scheduleCard = (
    <div className="border-t border-slate-100 pt-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-black text-slate-900">Horario de atención</h3>
        <button type="button" onClick={() => setScheduleOpen(true)} className="text-[10px] font-bold text-blue-700 hover:underline">
          Ampliar
        </button>
      </div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setScheduleOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") setScheduleOpen(true);
        }}
        className="cursor-zoom-in rounded-xl border border-slate-200 bg-slate-50 p-2"
        aria-label="Ampliar horario de atención"
      >
        <StoreScheduleGrid schedule={schedule} mini />
      </div>
      <p className="mt-2 text-[9px] text-slate-400">Toca el calendario para verlo más grande.</p>
    </div>
  );

  const productsBlock = (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black text-slate-950">Productos</h3>
        <span className="text-[10px] font-bold text-blue-700">{visibleProducts.length} disponible(s)</span>
      </div>
      {visibleProducts.length === 0 ? (
        <div className="mt-3 rounded-xl bg-slate-50 p-6 text-center text-xs text-slate-400">
          Tu producto inicial aparecerá aquí cuando esté completo.
        </div>
      ) : (
        <div className={mobile ? "mt-3 grid grid-cols-2 gap-2" : "mt-3 grid grid-cols-2 gap-3 2xl:grid-cols-3"}>
          {visibleProducts.slice(0, mobile ? 6 : 9).map((product) => (
            <ProductCard key={product.id} product={product} mobile={mobile} />
          ))}
        </div>
      )}
    </section>
  );

  return (
    <>
      <section className={mobile ? "mx-auto w-full max-w-[390px] space-y-3 rounded-[28px] border border-slate-200 bg-slate-50 p-3 shadow-xl" : "rounded-3xl border border-slate-200 bg-slate-50 p-3 shadow-xl"}>
        {mobile ? (
          <>
            <div className="h-40 overflow-hidden rounded-2xl bg-slate-200">
              {coverUrl ? (
                <img src={coverUrl} alt="Portada de la tienda" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-100 via-slate-100 to-cyan-100 px-5 text-center text-xs font-bold text-slate-400">Tu portada aparecerá aquí</div>
              )}
            </div>
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <StoreIdentity name={name} sellerName={sellerName} description={description} deliveryLocation={deliveryLocation} logoUrl={logoUrl} />
            </section>
            {productsBlock}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <WhyChoose storeName={name} />
              <div className="mt-4">{scheduleCard}</div>
            </section>
          </>
        ) : (
          <div className="grid gap-3 xl:grid-cols-[220px_minmax(0,1fr)] 2xl:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <StoreIdentity name={name} sellerName={sellerName} description={description} deliveryLocation={deliveryLocation} logoUrl={logoUrl} />
              <div className="mt-4 border-t border-slate-100 pt-4"><WhyChoose storeName={name} /></div>
              <div className="mt-4">{scheduleCard}</div>
            </aside>

            <div className="min-w-0 space-y-3">
              <div className="h-44 overflow-hidden rounded-2xl bg-slate-200 shadow-sm sm:h-52">
                {coverUrl ? (
                  <img src={coverUrl} alt="Portada de la tienda" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-100 via-slate-100 to-cyan-100 px-5 text-center text-sm font-bold text-slate-400">Tu portada aparecerá aquí</div>
                )}
              </div>
              {productsBlock}
            </div>
          </div>
        )}
      </section>

      {scheduleOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Horario completo de la tienda">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-950">Horario de atención</h2>
                <p className="mt-1 text-sm text-slate-500">Vista ampliada de los bloques seleccionados.</p>
              </div>
              <button type="button" onClick={() => setScheduleOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl font-black text-slate-700" aria-label="Cerrar horario">×</button>
            </div>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-2 sm:p-4">
              <StoreScheduleGrid schedule={schedule} compact />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
