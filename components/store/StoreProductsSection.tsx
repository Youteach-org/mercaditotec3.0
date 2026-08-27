"use client";

import type { User } from "firebase/auth";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { loadPublicCategories, type StoreCategoryApiRecord } from "@/lib/store/categoryClient";
import { uploadStoreMedia } from "@/lib/store/mediaClient";
import {
  createStoreProduct,
  deleteStoreProduct,
  loadStoreProducts,
  updateStoreProduct,
  type StoreProductApiRecord,
} from "@/lib/store/productClient";
import type { ProductPriceType, ProductVisibility } from "@/lib/store/productDomain";

interface Props {
  user: User;
  storeId: string;
  editable: boolean;
  onProductsChanged?: (products: StoreProductApiRecord[]) => void;
}

interface FormState {
  title: string;
  description: string;
  categoryId: string;
  priceType: ProductPriceType;
  priceAmount: string;
  visibility: ProductVisibility;
  imageUrls: string[];
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  categoryId: "",
  priceType: "fixed",
  priceAmount: "",
  visibility: "hidden",
  imageUrls: [],
};

function priceLabel(product: StoreProductApiRecord) {
  if (product.priceType === "ask") return "Preguntar al vendedor";
  const amount = `$${Number(product.priceAmount ?? 0).toFixed(2)} MXN`;
  return product.priceType === "negotiable" ? `${amount} — a tratar` : amount;
}

export default function StoreProductsSection({
  user,
  storeId,
  editable,
  onProductsChanged,
}: Props) {
  const [products, setProducts] = useState<StoreProductApiRecord[]>([]);
  const [categories, setCategories] = useState<StoreCategoryApiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextProducts, nextCategories] = await Promise.all([
        loadStoreProducts(user, storeId),
        loadPublicCategories(),
      ]);
      setProducts(nextProducts);
      setCategories(nextCategories);
      onProductsChanged?.(nextProducts);
      setForm((current) => ({
        ...current,
        categoryId: current.categoryId || nextCategories[0]?.id || "",
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los productos.");
    } finally {
      setLoading(false);
    }
  }, [onProductsChanged, storeId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setEditingId(null);
    setNewFiles([]);
    setForm({ ...EMPTY_FORM, categoryId: categories[0]?.id || "" });
  }

  function edit(product: StoreProductApiRecord) {
    setEditingId(product.id);
    setNewFiles([]);
    setForm({
      title: product.title,
      description: product.description,
      categoryId: product.categoryId,
      priceType: product.priceType,
      priceAmount: product.priceAmount === null ? "" : String(product.priceAmount),
      visibility: product.visibility,
      imageUrls: product.imageUrls,
    });
  }

  async function uploadFiles(productId: string, currentUrls: string[]) {
    const remaining = 5 - currentUrls.length;
    if (newFiles.length > remaining) {
      throw new Error("Un producto puede tener máximo 5 imágenes.");
    }

    const uploaded = [...currentUrls];
    for (const file of newFiles) {
      uploaded.push(
        await uploadStoreMedia({
          storeId,
          kind: "product",
          productId,
          file,
        }),
      );
    }
    return uploaded;
  }

  function normalizedInput(imageUrls: string[], visibility = form.visibility) {
    const numericAmount = Number(form.priceAmount);
    return {
      title: form.title,
      description: form.description,
      imageUrls,
      categoryId: form.categoryId,
      priceType: form.priceType,
      priceAmount: form.priceType === "ask" ? null : numericAmount,
      visibility,
    };
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editable) return;
    if (!form.categoryId) {
      setError("Debes seleccionar una categoría.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (editingId) {
        const imageUrls = await uploadFiles(editingId, form.imageUrls);
        await updateStoreProduct(user, storeId, editingId, normalizedInput(imageUrls));
      } else {
        // Se crea oculto primero para obtener un ID seguro donde guardar las fotos.
        const created = await createStoreProduct(
          user,
          storeId,
          normalizedInput([], "hidden"),
        );
        const imageUrls = await uploadFiles(created.id, []);
        await updateStoreProduct(user, storeId, created.id, normalizedInput(imageUrls));
      }

      setMessage(editingId ? "Producto actualizado." : "Producto creado.");
      resetForm();
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el producto.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(product: StoreProductApiRecord) {
    if (!editable) return;
    if (!window.confirm(`¿Eliminar definitivamente "${product.title}"?`)) return;

    setError("");
    setMessage("");
    try {
      await deleteStoreProduct(user, storeId, product.id);
      if (editingId === product.id) resetForm();
      setMessage("Producto eliminado definitivamente.");
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el producto.");
    }
  }

  async function toggleVisibility(product: StoreProductApiRecord) {
    if (!editable) return;
    const visibility: ProductVisibility = product.visibility === "published" ? "hidden" : "published";
    setError("");
    setMessage("");
    try {
      await updateStoreProduct(user, storeId, product.id, {
        title: product.title,
        description: product.description,
        imageUrls: product.imageUrls,
        categoryId: product.categoryId,
        priceType: product.priceType,
        priceAmount: product.priceAmount,
        visibility,
      });
      setMessage(visibility === "published" ? "Producto publicado." : "Producto ocultado.");
      await load();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "No se pudo cambiar el producto.");
    }
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-md">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Productos</h2>
          <p className="mt-1 text-sm text-gray-600">
            Agrega lo que venderás. Cada producto puede tener hasta 5 fotos.
          </p>
        </div>
        <div className="text-sm font-semibold text-gray-500">{products.length} producto(s)</div>
      </div>

      {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</div>}

      {loading ? (
        <p className="mt-5 text-gray-600">Cargando productos...</p>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {products.map((product) => (
            <article key={product.id} className="rounded-2xl border border-gray-200 p-4">
              {product.imageUrls[0] ? (
                <img src={product.imageUrls[0]} alt={product.title} className="h-40 w-full rounded-xl object-cover" />
              ) : (
                <div className="flex h-40 items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-400">Sin foto</div>
              )}
              <div className="mt-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-gray-900">{product.title}</h3>
                  <p className="text-sm font-semibold text-blue-700">{priceLabel(product)}</p>
                  <p className="mt-1 text-xs text-gray-500">{categoryNames.get(product.categoryId) ?? "Categoría no disponible"}</p>
                </div>
                <span className={product.visibility === "published" ? "rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800" : "rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700"}>
                  {product.visibility === "published" ? "Publicado" : "Oculto"}
                </span>
              </div>
              {editable && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => edit(product)} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white">Editar</button>
                  <button type="button" onClick={() => void toggleVisibility(product)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700">
                    {product.visibility === "published" ? "Ocultar" : "Publicar"}
                  </button>
                  <button type="button" onClick={() => void remove(product)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">Eliminar</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {editable && (
        <form onSubmit={save} className="mt-6 rounded-2xl bg-gray-50 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-gray-900">{editingId ? "Editar producto" : "Agregar producto"}</h3>
            {editingId && <button type="button" onClick={resetForm} className="text-sm font-semibold text-blue-700">Cancelar edición</button>}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Nombre</span>
              <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required minLength={2} maxLength={100} className="w-full rounded-xl border border-gray-300 px-4 py-3" />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Categoría</span>
              <select value={form.categoryId} onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))} required className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3">
                <option value="">Selecciona una categoría</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Descripción</span>
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={4} maxLength={1500} className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3" />
          </label>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Modalidad de precio</span>
              <select value={form.priceType} onChange={(event) => setForm((current) => ({ ...current, priceType: event.target.value as ProductPriceType }))} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3">
                <option value="fixed">Precio fijo</option>
                <option value="negotiable">Precio a tratar</option>
                <option value="ask">Preguntar al vendedor</option>
              </select>
            </label>

            {form.priceType !== "ask" && (
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">Precio MXN</span>
                <input type="number" min="0.01" step="0.01" value={form.priceAmount} onChange={(event) => setForm((current) => ({ ...current, priceAmount: event.target.value }))} required className="w-full rounded-xl border border-gray-300 px-4 py-3" />
              </label>
            )}

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Estado</span>
              <select value={form.visibility} onChange={(event) => setForm((current) => ({ ...current, visibility: event.target.value as ProductVisibility }))} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3">
                <option value="hidden">Oculto</option>
                <option value="published">Publicado</option>
              </select>
            </label>
          </div>

          {form.imageUrls.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {form.imageUrls.map((url, index) => (
                <div key={url} className="relative overflow-hidden rounded-xl border border-gray-200">
                  <img src={url} alt={`Foto ${index + 1}`} className="h-24 w-full object-cover" />
                  <button type="button" onClick={() => setForm((current) => ({ ...current, imageUrls: current.imageUrls.filter((item) => item !== url) }))} className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-1 text-xs font-bold text-white">×</button>
                </div>
              ))}
            </div>
          )}

          <label className="mt-4 block cursor-pointer rounded-xl border border-dashed border-gray-300 bg-white p-4 text-center text-sm font-semibold text-gray-700">
            Agregar fotos ({form.imageUrls.length + newFiles.length}/5)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                setNewFiles(files.slice(0, Math.max(0, 5 - form.imageUrls.length)));
              }}
            />
          </label>
          {newFiles.length > 0 && <p className="mt-2 text-xs text-gray-500">{newFiles.length} foto(s) nuevas listas para subir. Máximo 1 MB cada una.</p>}

          <button type="submit" disabled={saving || categories.length === 0} className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:bg-blue-300">
            {saving ? "Guardando..." : editingId ? "Guardar producto" : "Agregar producto"}
          </button>
          {categories.length === 0 && <p className="mt-2 text-sm text-orange-700">No hay categorías oficiales activas. Administración debe crear al menos una.</p>}
        </form>
      )}
    </section>
  );
}
