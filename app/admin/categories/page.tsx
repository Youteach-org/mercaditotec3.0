"use client";

import AdminQuickNav from "@/components/admin/AdminQuickNav";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { isAdminRole } from "@/lib/security/domain";
import {
  CATEGORY_ICON_KEYS,
  CATEGORY_ICON_LABELS,
  type CategoryIconKey,
} from "@/lib/store/categoryIcon";
import {
  createAdminCategory,
  loadAdminCategories,
  updateAdminCategory,
  type StoreCategoryApiRecord,
} from "@/lib/store/categoryClient";
import { useSession } from "@/lib/useSession";
import CategoryIcon from "@/components/store/CategoryIcon";


function IconPicker({
  value,
  onChange,
  disabled = false,
  label,
}: {
  value: CategoryIconKey | "";
  onChange: (next: CategoryIconKey) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm font-bold text-gray-700">{label}</legend>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {CATEGORY_ICON_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            disabled={disabled}
            aria-label={`Seleccionar icono: ${CATEGORY_ICON_LABELS[key]}`}
            aria-pressed={value === key}
            onClick={() => onChange(key)}
            className={`flex min-h-24 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border-2 px-2 py-3 text-center transition disabled:opacity-50 ${value === key ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-200" : "border-gray-200 bg-white hover:border-gray-400"}`}
          >
            <span aria-hidden="true" className="mkt-category-icon-wrap !h-12 !w-12 !min-h-0 !min-w-0"><CategoryIcon id={key} /></span>
            <span className="text-xs font-semibold leading-tight text-gray-700">{CATEGORY_ICON_LABELS[key]}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function AdminCategoriesPage() {
  const router = useRouter();
  const { firebaseUser, appUser, loading: sessionLoading } = useSession();
  const isAdmin = isAdminRole(appUser);

  const [categories, setCategories] = useState<StoreCategoryApiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [iconKey, setIconKey] = useState<CategoryIconKey | "">("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (sessionLoading) return;
    if (!firebaseUser) {
      router.replace("/login");
      return;
    }
    if (!isAdmin) router.replace("/marketplace");
  }, [firebaseUser, isAdmin, router, sessionLoading]);

  const load = useCallback(async () => {
    if (!firebaseUser || !isAdmin) return;

    setLoading(true);
    setError("");

    try {
      setCategories(await loadAdminCategories(firebaseUser));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar las categorías.",
      );
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, isAdmin]);

  useEffect(() => {
    if (firebaseUser && isAdmin) void load();
  }, [firebaseUser, isAdmin, load]);

  async function createCategory(event: FormEvent) {
    event.preventDefault();
    if (!firebaseUser) return;

    if (!iconKey) {
      setError("Selecciona el icono que corresponde a la categoría.");
      return;
    }

    setCreating(true);
    setError("");
    setMessage("");

    try {
      const category = await createAdminCategory(firebaseUser, {
        name,
        active: true,
        iconKey,
      });

      setCategories((current) =>
        [...current, category].sort((a, b) => a.name.localeCompare(b.name, "es")),
      );
      setName("");
      setIconKey("");
      setMessage("Categoría creada.");
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "No se pudo crear la categoría.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function toggleCategory(category: StoreCategoryApiRecord) {
    if (!firebaseUser) return;

    setError("");
    setMessage("");

    try {
      const updated = await updateAdminCategory(firebaseUser, category.id, {
        name: category.name,
        active: !category.active,
        iconKey: category.iconKey,
      });

      setCategories((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setMessage(updated.active ? "Categoría activada." : "Categoría desactivada.");
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "No se pudo actualizar la categoría.",
      );
    }
  }

  async function changeCategoryIcon(
    category: StoreCategoryApiRecord,
    nextIconKey: CategoryIconKey,
  ) {
    if (!firebaseUser || nextIconKey === category.iconKey) return;

    setError("");
    setMessage("");

    try {
      const updated = await updateAdminCategory(firebaseUser, category.id, {
        name: category.name,
        active: category.active,
        iconKey: nextIconKey,
      });

      setCategories((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setMessage(`Icono de “${updated.name}” actualizado.`);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "No se pudo actualizar el icono.",
      );
    }
  }

  if (sessionLoading || !firebaseUser || !isAdmin) {
    return (
      <main className="min-h-screen bg-gray-100 p-4">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow-md">
        <AdminQuickNav />
          Verificando permisos...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="rounded-2xl bg-white p-6 shadow-md">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link href="/admin" className="text-sm font-semibold text-blue-700 hover:underline">
                ← Centro de administración
              </Link>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">Categorías de tiendas</h1>
              <p className="mt-1 text-gray-600">
                Estas son las categorías oficiales que los vendedores podrán asignar a sus productos.
              </p>
            </div>

            <Link
              href="/admin/stores"
              className="font-semibold text-blue-700 hover:underline"
            >
              Administración de tiendas
            </Link>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
            {message}
          </div>
        )}

        <form onSubmit={createCategory} className="rounded-2xl bg-white p-6 shadow-md">
          <h2 className="text-xl font-bold text-gray-900">Nueva categoría</h2>
          <div className="mt-4 space-y-4">
            <label className="block text-sm font-bold text-gray-700">
              Nombre
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                minLength={2}
                maxLength={60}
                placeholder="Ej. Alimentos y bebidas"
                className="mt-2 block w-full min-w-0 rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
              />
            </label>
            <IconPicker label="Selecciona un icono (vista previa)" value={iconKey} onChange={setIconKey} />
            <button
              type="submit"
              disabled={creating || !iconKey}
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              {creating ? "Creando..." : "Agregar categoría"}
            </button>
          </div>
        </form>

        <section className="rounded-2xl bg-white p-6 shadow-md">
          <h2 className="text-xl font-bold text-gray-900">Categorías oficiales</h2>
          {loading ? (
            <p className="mt-4 text-gray-600">Cargando...</p>
          ) : categories.length === 0 ? (
            <p className="mt-4 text-gray-600">Todavía no hay categorías. Crea la primera arriba.</p>
          ) : (
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {categories.map((category) => (
                <article key={category.id} className="min-w-0 rounded-2xl border-2 border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="mkt-category-icon-wrap !h-16 !w-16 shrink-0" aria-hidden="true">
                        <CategoryIcon id={category.iconKey} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="break-words text-lg font-bold text-gray-900">{category.name}</h3>
                        <p className={category.active ? "mt-1 font-semibold text-green-700" : "mt-1 font-semibold text-gray-500"}>
                          {category.active ? "Activa" : "Inactiva"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void toggleCategory(category)}
                      className={category.active
                        ? "shrink-0 rounded-xl border border-red-200 px-4 py-2 font-semibold text-red-700 hover:bg-red-50"
                        : "shrink-0 rounded-xl border border-green-200 px-4 py-2 font-semibold text-green-700 hover:bg-green-50"}
                    >
                      {category.active ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                  <div className="mt-5 border-t border-gray-200 pt-4">
                    <IconPicker
                      label="Cambiar icono"
                      value={category.iconKey}
                      onChange={(key) => void changeCategoryIcon(category, key)}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
