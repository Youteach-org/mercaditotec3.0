"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  DEFAULT_MARKETPLACE_CONTENT,
  type MarketplaceContent,
} from "@/lib/store/marketplaceContent";
import { storeApiFetch } from "@/lib/store/client";
import {
  loadAdminCategories,
  type StoreCategoryApiRecord,
} from "@/lib/store/categoryClient";
import { isAdminRole } from "@/lib/security/domain";
import { useSession } from "@/lib/useSession";

function TextField({
  label,
  value,
  onChange,
  multiline = false,
  help,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  help?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-gray-800">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          className="w-full resize-y rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
        />
      )}
      {help && <span className="mt-1 block text-xs text-gray-500">{help}</span>}
    </label>
  );
}

export default function AdminMarketplacePage() {
  const router = useRouter();
  const { firebaseUser, appUser, loading: sessionLoading } = useSession();
  const [content, setContent] = useState<MarketplaceContent>(DEFAULT_MARKETPLACE_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approvedCategories, setApprovedCategories] = useState<StoreCategoryApiRecord[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionLoading) return;
    if (!firebaseUser) {
      router.replace("/login");
      return;
    }
    if (!isAdminRole(appUser)) router.replace("/marketplace");
  }, [appUser, firebaseUser, router, sessionLoading]);

  useEffect(() => {
    if (!firebaseUser || !isAdminRole(appUser)) return;
    let cancelled = false;
    void Promise.all([
      storeApiFetch(firebaseUser, "/api/admin/marketplace-content"),
      loadAdminCategories(firebaseUser),
    ])
      .then(async ([response, categories]) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "No se pudo cargar la configuración.");
        if (!cancelled && data.content) setContent(data.content as MarketplaceContent);
        if (!cancelled) setApprovedCategories(categories.filter((category) => category.active));
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la configuración.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [appUser, firebaseUser]);

  function update<K extends keyof MarketplaceContent>(key: K, value: MarketplaceContent[K]) {
    setContent((current) => ({ ...current, [key]: value }));
    setMessage("");
  }

  function toggleMarketplaceCategory(categoryId: string) {
    setContent((current) => {
      const alreadySelected = current.marketplaceCategoryIds.includes(categoryId);
      const selected = alreadySelected
        ? current.marketplaceCategoryIds.filter((id) => id !== categoryId)
        : current.marketplaceCategoryIds.length >= 5
          ? current.marketplaceCategoryIds
          : [...current.marketplaceCategoryIds, categoryId];

      if (!alreadySelected && current.marketplaceCategoryIds.length >= 5) {
        setError("Puedes mostrar hasta 5 categorías directas; el sexto botón es “Todas”.");
      } else {
        setError("");
      }

      return {
        ...current,
        marketplaceCategoryIds: selected,
      };
    });
    setMessage("");
  }

  async function save() {
    if (!firebaseUser) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await storeApiFetch(firebaseUser, "/api/admin/marketplace-content", {
        method: "PATCH",
        body: JSON.stringify(content),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar la configuración.");
      setContent(data.content as MarketplaceContent);
      setMessage("Cambios guardados en la portada del Mercadito.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la configuración.");
    } finally {
      setSaving(false);
    }
  }

  if (sessionLoading || loading || !firebaseUser || !isAdminRole(appUser)) {
    return (
      <main className="min-h-screen bg-gray-100 p-4">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow-md">
          Cargando editor del Mercadito...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="rounded-2xl bg-slate-950 p-6 text-white shadow-lg">
          <Link href="/admin" className="text-sm font-bold text-sky-300 hover:underline">← Administración</Link>
          <h1 className="mt-2 text-3xl font-black">Editar portada del Mercadito</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Edita los textos decorativos, post-its y buscador. Las categorías se seleccionan desde la lista aprobada del sistema.
          </p>
        </section>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">{error}</div>}
        {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-700">{message}</div>}

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4 rounded-2xl bg-white p-5 shadow-md">
            <h2 className="text-xl font-black text-gray-900">Encabezado y buscador</h2>
            <TextField label="Título principal" value={content.heroTitle} onChange={(value) => update("heroTitle", value)} />
            <TextField label="Palabra destacada" value={content.heroEmphasis} onChange={(value) => update("heroEmphasis", value)} />
            <TextField label="Subtítulo" value={content.heroSubtitle} multiline help="Usa saltos de línea como quieres que aparezcan." onChange={(value) => update("heroSubtitle", value)} />
            <TextField label="Texto del buscador" value={content.searchPlaceholder} onChange={(value) => update("searchPlaceholder", value)} />
            <TextField label="Botón del buscador" value={content.searchButtonLabel} onChange={(value) => update("searchButtonLabel", value)} />
            <TextField label="Título de tiendas destacadas" value={content.featuredHeading} onChange={(value) => update("featuredHeading", value)} />
            <TextField label="Título de tiendas adicionales" value={content.moreStoresHeading} onChange={(value) => update("moreStoresHeading", value)} />
          </div>

          <div className="space-y-4 rounded-2xl bg-white p-5 shadow-md">
            <h2 className="text-xl font-black text-gray-900">Post-its y notas del collage</h2>
            <TextField label="Post-it rosa" value={content.pinkNote} multiline onChange={(value) => update("pinkNote", value)} />
            <TextField label="Post-it azul" value={content.blueNote} multiline onChange={(value) => update("blueNote", value)} />
            <TextField label="Post-it naranja" value={content.orangeNote} multiline onChange={(value) => update("orangeNote", value)} />
            <TextField label="Nota del campus" value={content.campusNote} multiline onChange={(value) => update("campusNote", value)} />
            <TextField label="Nota de estudiantes" value={content.studentsNote} multiline onChange={(value) => update("studentsNote", value)} />
            <TextField label="Bloque azul inferior" value={content.bottomBlueNote} multiline onChange={(value) => update("bottomBlueNote", value)} />
            <TextField label="Letrero DESCUBRE" value={content.discoverLabel} onChange={(value) => update("discoverLabel", value)} />
            <TextField label="Post-it inferior derecho" value={content.futureNote} multiline onChange={(value) => update("futureNote", value)} />
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-md">
          <h2 className="text-xl font-black text-gray-900">Categorías visibles en el Mercadito</h2>
          <p className="mt-2 text-sm text-gray-600">
            Selecciona únicamente entre las categorías aprobadas para tiendas y productos.
            Estas mismas categorías se usarán como filtros; ya no son etiquetas independientes.
          </p>

          {approvedCategories.length === 0 ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
              No hay categorías activas disponibles.
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-3">
              {approvedCategories.map((category) => {
                const selected = content.marketplaceCategoryIds.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggleMarketplaceCategory(category.id)}
                    className={
                      selected
                        ? "rounded-full border-2 border-blue-700 bg-blue-700 px-4 py-2 font-black text-white shadow-sm"
                        : "rounded-full border-2 border-gray-300 bg-white px-4 py-2 font-bold text-gray-800 hover:border-blue-400"
                    }
                    aria-pressed={selected}
                  >
                    {selected ? "✓ " : ""}{category.name}
                  </button>
                );
              })}
            </div>
          )}

          <p className="mt-4 text-xs font-semibold text-gray-500">
            Puedes elegir hasta 5 categorías directas. “Todas” se muestra automáticamente como sexto filtro. Si no eliges ninguna, se usarán las primeras 5 categorías activas.
          </p>
        </section>

        <section className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-2xl border border-blue-200 bg-white p-4 shadow-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-600">Los cambios se publican en la portada al guardar.</div>
          <div className="flex gap-2">
            <Link href="/marketplace" className="rounded-xl border border-gray-300 px-5 py-3 font-bold text-gray-800">Ver Mercadito</Link>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="rounded-xl bg-blue-600 px-6 py-3 font-black text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
