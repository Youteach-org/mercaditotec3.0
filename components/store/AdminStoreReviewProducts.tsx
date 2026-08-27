"use client";

import type { User } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";

import type { StoreCategoryApiRecord } from "@/lib/store/categoryClient";
import { storeApiFetch } from "@/lib/store/client";
import type { StoreProductApiRecord } from "@/lib/store/productClient";

interface Props {
  user: User;
  storeId: string;
}

function priceLabel(product: StoreProductApiRecord) {
  if (product.priceType === "ask") return "Preguntar al vendedor";
  const amount = `$${Number(product.priceAmount ?? 0).toFixed(2)} MXN`;
  return product.priceType === "negotiable" ? `${amount} · a tratar` : amount;
}

export default function AdminStoreReviewProducts({ user, storeId }: Props) {
  const [products, setProducts] = useState<StoreProductApiRecord[]>([]);
  const [categories, setCategories] = useState<StoreCategoryApiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void (async () => {
      setLoading(true);
      setError("");

      try {
        const response = await storeApiFetch(user, `/api/admin/stores/${storeId}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "No se pudieron cargar los productos para revisión.");
        }

        if (!active) return;
        setProducts(Array.isArray(data.products) ? data.products : []);
        setCategories(Array.isArray(data.categories) ? data.categories : []);
      } catch (loadError) {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudieron cargar los productos para revisión.",
        );
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [storeId, user]);

  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const suggested = useMemo(
    () => [
      ...new Set(
        products
          .map((product) => product.suggestedCategoryName?.trim() ?? "")
          .filter(Boolean),
      ),
    ],
    [products],
  );

  return (
    <section className="rounded-2xl bg-white p-6 shadow-md">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Productos para revisión</h2>
          <p className="mt-1 text-sm text-gray-600">
            Revisa productos, fotografías, precio y categoría antes de aprobar la tienda.
          </p>
        </div>
        {!loading && (
          <div className="text-sm font-semibold text-gray-500">
            {products.length} producto(s)
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {suggested.length > 0 && (
        <div className="mt-5 rounded-xl border border-violet-200 bg-violet-50 p-4">
          <div className="text-sm font-bold text-violet-900">Categorías sugeridas por esta tienda</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {suggested.map((name) => (
              <span
                key={name}
                className="rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-800"
              >
                {name}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-violet-800">
            Al aprobar la tienda, estas categorías se incorporarán a la lista general si todavía no existen.
          </p>
        </div>
      )}

      {loading ? (
        <p className="mt-5 text-gray-600">Cargando productos...</p>
      ) : products.length === 0 ? (
        <p className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
          Esta tienda no tiene productos registrados.
        </p>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {products.map((product) => {
            const categoryLabel = product.suggestedCategoryName
              ? product.suggestedCategoryName
              : categoryNames.get(product.categoryId) ?? "Categoría no disponible";

            return (
              <article key={product.id} className="rounded-2xl border border-gray-200 p-4">
                {product.imageUrls[0] ? (
                  <img
                    src={product.imageUrls[0]}
                    alt={product.title}
                    className="h-40 w-full rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-400">
                    Sin foto
                  </div>
                )}

                <div className="mt-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900">{product.title}</h3>
                    <p className="text-sm font-semibold text-blue-700">{priceLabel(product)}</p>
                    <p className="mt-1 text-xs text-gray-600">
                      {product.suggestedCategoryName ? "Categoría sugerida: " : "Categoría: "}
                      <span className="font-semibold">{categoryLabel}</span>
                    </p>
                  </div>
                  <span
                    className={
                      product.visibility === "published"
                        ? "rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800"
                        : "rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700"
                    }
                  >
                    {product.visibility === "published" ? "Publicado" : "Oculto"}
                  </span>
                </div>

                {product.description && (
                  <p className="mt-3 text-sm text-gray-700">{product.description}</p>
                )}

                {product.imageUrls.length > 1 && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {product.imageUrls.slice(1).map((url, index) => (
                      <img
                        key={url}
                        src={url}
                        alt={`${product.title} ${index + 2}`}
                        className="h-16 w-full rounded-lg object-cover"
                      />
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
