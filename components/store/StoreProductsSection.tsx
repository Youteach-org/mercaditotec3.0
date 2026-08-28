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
import type { StoreStatus } from "@/lib/store/domain";
import type { ProductPriceType, ProductVisibility } from "@/lib/store/productDomain";

interface Props {
  user: User;
  storeId: string;
  storeStatus: StoreStatus;
  editable: boolean;
  onProductsChanged?: (products: StoreProductApiRecord[]) => void;
}

interface FormState {
  title: string;
  description: string;
  categoryId: string;
  suggestedCategoryName: string;
  priceType: ProductPriceType;
  priceAmount: string;
  visibility: ProductVisibility;
  imageUrls: string[];
}

const SUGGEST_VALUE = "__suggest_category__";
const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  categoryId: "",
  suggestedCategoryName: "",
  priceType: "fixed",
  priceAmount: "",
  visibility: "published",
  imageUrls: [],
};

function priceLabel(product: StoreProductApiRecord) {
  if (product.priceType === "ask") return "Preguntar al vendedor";
  const amount = `$${Number(product.priceAmount ?? 0).toFixed(2)} MXN`;
  return product.priceType === "negotiable" ? `${amount} — a tratar` : amount;
}

function ValidationModal({ message, onClose }: { message: string; onClose: () => void }) {
  if (!message) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-xl font-black text-red-700">!</div>
        <h3 className="mt-4 text-xl font-bold text-gray-900">Falta completar el producto</h3>
        <p className="mt-2 text-gray-600">{message}</p>
        <button type="button" onClick={onClose} autoFocus className="mt-5 w-full rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white">
          Entendido
        </button>
      </div>
    </div>
  );
}

export default function StoreProductsSection({
  user,
  storeId,
  storeStatus,
  editable,
  onProductsChanged,
}: Props) {
  const [products, setProducts] = useState<StoreProductApiRecord[]>([]);
  const [categories, setCategories] = useState<StoreCategoryApiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  const creationMode = storeStatus === "draft" || storeStatus === "changes_required";
  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );
  const newFilePreviews = useMemo(
    () => newFiles.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [newFiles],
  );

  useEffect(() => {
    return () => {
      newFilePreviews.forEach(({ url }) => URL.revokeObjectURL(url));
    };
  }, [newFilePreviews]);

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
        categoryId:
          current.categoryId || current.suggestedCategoryName
            ? current.categoryId
            : nextCategories[0]?.id || "",
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
    setValidationMessage("");
    setForm({
      title: product.title,
      description: product.description,
      categoryId: product.categoryId,
      suggestedCategoryName: product.suggestedCategoryName ?? "",
      priceType: product.priceType,
      priceAmount: product.priceAmount === null ? "" : String(product.priceAmount),
      visibility: creationMode ? "published" : product.visibility,
      imageUrls: product.imageUrls,
    });
    window.setTimeout(() => document.getElementById("initial-product-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  async function uploadFiles(productId: string, currentUrls: string[]) {
    const remaining = 5 - currentUrls.length;
    if (newFiles.length > remaining) throw new Error("Un producto puede tener máximo 5 imágenes.");

    const uploaded = [...currentUrls];
    for (const file of newFiles) {
      uploaded.push(await uploadStoreMedia({ storeId, kind: "product", productId, file }));
    }
    return uploaded;
  }

  function normalizedInput(imageUrls: string[], visibility: ProductVisibility) {
    return {
      title: form.title,
      description: form.description,
      imageUrls,
      categoryId: form.categoryId,
      ...(form.suggestedCategoryName.trim()
        ? { suggestedCategoryName: form.suggestedCategoryName.trim() }
        : {}),
      priceType: form.priceType,
      priceAmount: form.priceType === "ask" ? null : Number(form.priceAmount),
      visibility,
    };
  }

  function validateBeforeSave() {
    if (form.title.trim().length < 2) return "Escribe el nombre del producto.";
    if (!form.categoryId && !form.suggestedCategoryName.trim()) return "Selecciona una categoría o escribe una categoría sugerida.";
    if (form.suggestedCategoryName.trim() && form.suggestedCategoryName.trim().length < 2) return "La categoría sugerida debe tener al menos 2 caracteres.";
    if (form.priceType !== "ask" && (!form.priceAmount || Number(form.priceAmount) <= 0)) return "Escribe un precio mayor que cero.";
    if (form.imageUrls.length + newFiles.length === 0) return "Agrega al menos una imagen del producto. La foto es obligatoria para enviar la tienda a revisión.";
    return "";
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editable) return;

    const validation = validateBeforeSave();
    if (validation) {
      setValidationMessage(validation);
      return;
    }
    if (creationMode && !editingId && products.length >= 1) {
      setValidationMessage("Durante la creación solo se permite un producto inicial. Edita el producto existente para corregirlo.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const targetVisibility: ProductVisibility = creationMode ? "published" : form.visibility;
      if (editingId) {
        const imageUrls = await uploadFiles(editingId, form.imageUrls);
        await updateStoreProduct(user, storeId, editingId, normalizedInput(imageUrls, targetVisibility));
      } else {
        const created = await createStoreProduct(user, storeId, normalizedInput([], "hidden"));
        try {
          const imageUrls = await uploadFiles(created.id, []);
          await updateStoreProduct(user, storeId, created.id, normalizedInput(imageUrls, targetVisibility));
        } catch (createCompletionError) {
          try {
            await deleteStoreProduct(user, storeId, created.id);
          } catch {
            // Si la limpieza falla, el producto interno permanece oculto para poder corregirse después.
          }
          throw createCompletionError;
        }
      }

      setMessage(editingId ? "Producto actualizado." : creationMode ? "Producto inicial guardado. Puedes editarlo antes de enviar la tienda." : "Producto agregado.");
      resetForm();
      await load();
    } catch (saveError) {
      const text = saveError instanceof Error ? saveError.message : "No se pudo guardar el producto.";
      setError(text);
      setValidationMessage(text);
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
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el producto.");
    }
  }

  async function toggleVisibility(product: StoreProductApiRecord) {
    if (!editable || creationMode) return;
    const visibility: ProductVisibility = product.visibility === "published" ? "hidden" : "published";
    setError("");
    try {
      await updateStoreProduct(user, storeId, product.id, {
        title: product.title,
        description: product.description,
        imageUrls: product.imageUrls,
        categoryId: product.categoryId,
        ...(product.suggestedCategoryName ? { suggestedCategoryName: product.suggestedCategoryName } : {}),
        priceType: product.priceType,
        priceAmount: product.priceAmount,
        visibility,
      });
      await load();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "No se pudo cambiar el producto.");
    }
  }

  const categorySelection = form.suggestedCategoryName ? SUGGEST_VALUE : form.categoryId;
  const showForm = editable && (editingId !== null || !creationMode || products.length === 0);

  return (
    <section className="rounded-2xl bg-white p-5 shadow-md sm:p-6">
      <ValidationModal message={validationMessage} onClose={() => setValidationMessage("")} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{creationMode ? "Producto inicial" : "Productos"}</h2>
          <p className="mt-1 text-sm text-gray-600">
            {creationMode
              ? "Agrega un producto de ejemplo para que administración pueda revisar cómo funcionará tu tienda. Después de aprobarla podrás agregar todos los productos que necesites."
              : "Administra los productos de tu tienda. Cada producto puede tener hasta 5 fotos."}
          </p>
        </div>
        <div className="whitespace-nowrap text-sm font-semibold text-gray-500">{products.length} producto(s)</div>
      </div>

      {creationMode && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <strong>Solo para iniciar tu tienda:</strong> en esta etapa se registra un solo producto. Podrás agregar más cuando la tienda sea aprobada.
        </div>
      )}

      {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</div>}

      {loading ? (
        <p className="mt-5 text-gray-600">Cargando productos y categorías...</p>
      ) : products.length > 0 ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {products.map((product) => (
            <article key={product.id} className="rounded-2xl border border-gray-200 p-4">
              {product.imageUrls[0] ? (
                <img src={product.imageUrls[0]} alt={product.title} className="h-40 w-full rounded-xl object-cover" />
              ) : (
                <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-red-200 bg-red-50 text-sm font-semibold text-red-600">Falta imagen obligatoria</div>
              )}
              <div className="mt-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-gray-900">{product.title}</h3>
                  <p className="text-sm font-semibold text-blue-700">{priceLabel(product)}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {product.suggestedCategoryName ? `${product.suggestedCategoryName} · sugerida` : categoryNames.get(product.categoryId) ?? "Categoría"}
                  </p>
                </div>
                {creationMode ? (
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">Producto inicial</span>
                ) : (
                  <span className={product.visibility === "published" ? "rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800" : "rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700"}>
                    {product.visibility === "published" ? "Visible" : "Oculto"}
                  </span>
                )}
              </div>
              {editable && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => edit(product)} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
                    Editar producto
                  </button>
                  {!creationMode && (
                    <button type="button" onClick={() => void toggleVisibility(product)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700">
                      {product.visibility === "published" ? "Ocultar" : "Mostrar"}
                    </button>
                  )}
                  <button type="button" onClick={() => void remove(product)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">Eliminar</button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">Aún no has agregado el producto inicial.</p>
      )}

      {creationMode && products.length > 0 && !editingId && (
        <p className="mt-5 text-sm font-medium text-gray-600">Ya tienes el producto necesario para la solicitud. Si necesitas corregirlo, usa <strong>Editar producto</strong>.</p>
      )}

      {showForm && (
        <form id="initial-product-form" onSubmit={save} noValidate className="mt-6 rounded-2xl bg-gray-50 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-gray-900">{editingId ? "Editar producto" : creationMode ? "Agregar producto inicial" : "Agregar producto"}</h3>
            {editingId && <button type="button" onClick={resetForm} className="text-sm font-semibold text-blue-700">Cancelar edición</button>}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Nombre</span>
              <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} minLength={2} maxLength={100} placeholder="Ej. Brownie de chocolate" className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none" />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Categoría</span>
              <select value={categorySelection} onChange={(event) => {
                const value = event.target.value;
                setForm((current) => value === SUGGEST_VALUE ? { ...current, categoryId: "", suggestedCategoryName: current.suggestedCategoryName || "" } : { ...current, categoryId: value, suggestedCategoryName: "" });
              }} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900">
                <option value="">Selecciona una categoría</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                <option value={SUGGEST_VALUE}>＋ Sugerir categoría…</option>
              </select>
            </label>
          </div>

          {categorySelection === SUGGEST_VALUE && (
            <label className="mt-4 block rounded-xl border border-blue-100 bg-blue-50 p-3">
              <span className="mb-1 block text-sm font-semibold text-blue-900">Nueva categoría sugerida</span>
              <input value={form.suggestedCategoryName} onChange={(event) => setForm((current) => ({ ...current, categoryId: "", suggestedCategoryName: event.target.value }))} minLength={2} maxLength={60} placeholder="Ej. Robótica educativa" className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400" />
              <span className="mt-1 block text-xs text-blue-700">Si la tienda es aprobada, la categoría se agregará a la lista para futuras tiendas.</span>
            </label>
          )}

          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Descripción</span>
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={3} maxLength={1500} placeholder="Describe brevemente este producto" className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none" />
          </label>

          <div className={`mt-4 grid gap-4 ${creationMode ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Modalidad de precio</span>
              <select value={form.priceType} onChange={(event) => setForm((current) => ({ ...current, priceType: event.target.value as ProductPriceType }))} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900">
                <option value="fixed">Precio fijo</option>
                <option value="negotiable">Precio a tratar</option>
                <option value="ask">Preguntar al vendedor</option>
              </select>
            </label>

            {form.priceType !== "ask" && (
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">Precio MXN</span>
                <input type="number" min="0.01" step="0.01" value={form.priceAmount} onChange={(event) => setForm((current) => ({ ...current, priceAmount: event.target.value }))} placeholder="0.00" className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400" />
              </label>
            )}

            {!creationMode && (
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">En la tienda</span>
                <select value={form.visibility} onChange={(event) => setForm((current) => ({ ...current, visibility: event.target.value as ProductVisibility }))} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900">
                  <option value="published">Mostrar producto</option>
                  <option value="hidden">Mantener oculto</option>
                </select>
              </label>
            )}
          </div>

          {(form.imageUrls.length > 0 || newFilePreviews.length > 0) && (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {form.imageUrls.map((url, index) => (
                <div key={url} className="relative overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <img src={url} alt={`Foto actual ${index + 1}`} className="h-24 w-full object-cover" />
                  <button type="button" onClick={() => setForm((current) => ({ ...current, imageUrls: current.imageUrls.filter((item) => item !== url) }))} className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-1 text-xs font-bold text-white" aria-label="Quitar foto">×</button>
                </div>
              ))}
              {newFilePreviews.map(({ file, url }, index) => (
                <div key={`${file.name}-${index}`} className="overflow-hidden rounded-xl border-2 border-blue-300 bg-white">
                  <img src={url} alt={`Nueva foto ${index + 1}`} className="h-24 w-full object-cover" />
                  <div className="truncate px-2 py-1 text-[10px] font-medium text-gray-600">{file.name}</div>
                </div>
              ))}
            </div>
          )}

          <label className="mt-5 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 p-5 text-center hover:bg-blue-100">
            <span className="text-3xl" aria-hidden="true">🖼️</span>
            <span className="mt-2 font-bold text-blue-900">Sube una foto del producto</span>
            <span className="mt-1 text-sm text-blue-700">Toca aquí para elegir una imagen. Es obligatoria para el producto inicial.</span>
            <span className="mt-1 text-xs text-blue-600">JPG, PNG, WEBP o GIF · máximo 1 MB por imagen · hasta 5 fotos</span>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              setNewFiles(files.slice(0, Math.max(0, 5 - form.imageUrls.length)));
              event.currentTarget.value = "";
            }} />
          </label>

          <button type="submit" disabled={saving} className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300">
            {saving ? "Guardando..." : editingId ? "Actualizar producto" : creationMode ? "Guardar producto inicial" : "Agregar producto"}
          </button>
        </form>
      )}
    </section>
  );
}
