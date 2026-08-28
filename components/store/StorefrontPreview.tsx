import StoreScheduleGrid from "@/components/store/StoreScheduleGrid";
import type { StoreProductApiRecord } from "@/lib/store/productClient";
import { STORE_WEEK_DAYS, type StoreSchedule } from "@/lib/store/schedule";

interface Props {
  name: string;
  sellerName: string;
  description: string;
  logoUrl: string | null;
  coverUrl: string | null;
  schedule: StoreSchedule;
  products: StoreProductApiRecord[];
  compact?: boolean;
}

function priceLabel(product: StoreProductApiRecord) {
  if (product.priceType === "ask") return "Preguntar";
  const amount = `$${Number(product.priceAmount ?? 0).toFixed(2)}`;
  return product.priceType === "negotiable" ? `${amount} · a tratar` : amount;
}

export default function StorefrontPreview({
  name,
  sellerName,
  description,
  logoUrl,
  coverUrl,
  schedule,
  products,
  compact = false,
}: Props) {
  const visibleProducts = products.filter((product) => product.visibility === "published");
  const selectedHours = STORE_WEEK_DAYS.reduce(
    (total, day) => total + schedule[day].slots.length,
    0,
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
      <div className={compact ? "h-24 bg-slate-200" : "h-32 bg-slate-200 sm:h-40"}>
        {coverUrl ? (
          <img src={coverUrl} alt="Vista previa de portada" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-100 text-xs font-semibold text-slate-400">
            Tu portada aparecerá aquí
          </div>
        )}
      </div>

      <div className={compact ? "px-4 pb-4" : "px-5 pb-5"}>
        <div className="flex items-end justify-between gap-3">
          <div
            className={[
              "-mt-8 flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md",
              compact ? "h-16 w-16" : "h-20 w-20",
            ].join(" ")}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Vista previa del logo" className="h-full w-full object-cover" />
            ) : (
              <span className="px-1 text-center text-[10px] font-semibold text-gray-400">Logo</span>
            )}
          </div>
          <span className="mb-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800">
            Vista previa
          </span>
        </div>

        <h2 className={compact ? "mt-3 text-xl font-black text-gray-900" : "mt-3 text-2xl font-black text-gray-900"}>
          {name.trim() || "Nombre de tu tienda"}
        </h2>
        <p className="mt-0.5 text-xs font-semibold text-blue-700">{sellerName || "Tu perfil"}</p>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
          {description.trim() || "La descripción de tu tienda aparecerá aquí mientras la construyes."}
        </p>

        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Horario</h3>
            <span className="text-[10px] font-semibold text-gray-400">
              {selectedHours > 0 ? `${selectedHours} bloque(s) seleccionados` : "Aún sin horario"}
            </span>
          </div>
          <div className="rounded-xl bg-gray-50 p-2">
            <StoreScheduleGrid schedule={schedule} compact />
          </div>
        </div>

        <div className="mt-5 border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Productos</h3>
            <span className="text-[10px] font-semibold text-gray-400">{visibleProducts.length} visible(s)</span>
          </div>

          {visibleProducts.length === 0 ? (
            <div className="mt-3 rounded-xl bg-gray-50 p-4 text-center text-xs text-gray-400">
              Tu producto inicial aparecerá aquí cuando esté completo.
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {visibleProducts.slice(0, compact ? 4 : 6).map((product) => (
                <article key={product.id} className="overflow-hidden rounded-xl border border-gray-100 bg-white">
                  {product.imageUrls[0] ? (
                    <img src={product.imageUrls[0]} alt={product.title} className="h-20 w-full object-cover" />
                  ) : (
                    <div className="flex h-20 items-center justify-center bg-gray-100 text-[10px] text-gray-400">Sin foto</div>
                  )}
                  <div className="p-2">
                    <div className="line-clamp-1 text-xs font-bold text-gray-900">{product.title}</div>
                    <div className="mt-0.5 text-[10px] font-bold text-blue-700">{priceLabel(product)}</div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
