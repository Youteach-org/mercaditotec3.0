"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  storeApiFetch,
  storeStatusClasses,
  storeStatusLabel,
  type StoreApiRecord,
} from "@/lib/store/client";
import { useSession } from "@/lib/useSession";

export default function MyStoresPage() {
  const { firebaseUser, loading: sessionLoading } = useSession();
  const router = useRouter();
  const [stores, setStores] = useState<StoreApiRecord[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadStores = useCallback(async () => {
    if (!firebaseUser) return;
    setStoresLoading(true);
    setError("");

    try {
      const response = await storeApiFetch(firebaseUser, "/api/stores");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar tus tiendas.");
      setStores(Array.isArray(data.stores) ? data.stores : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar tus tiendas.");
    } finally {
      setStoresLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (firebaseUser) void loadStores();
  }, [firebaseUser, loadStores]);

  async function createStore() {
    if (!firebaseUser || creating) return;
    setCreating(true);
    setError("");

    try {
      const response = await storeApiFetch(firebaseUser, "/api/stores", {
        method: "POST",
        body: JSON.stringify({ bootstrap: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo iniciar la tienda.");

      const store = data.store as StoreApiRecord;
      try {
        window.sessionStorage.setItem(
          `mercaditotec3-store-draft-${store.id}`,
          JSON.stringify(store),
        );
      } catch {
        // El editor puede cargar desde el servidor si sessionStorage no está disponible.
      }

      router.push(`/mystore/${store.id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo iniciar la tienda.");
      setCreating(false);
    }
  }

  async function deleteDraft(store: StoreApiRecord) {
    if (!firebaseUser || store.status !== "draft" || deletingId) return;
    const label = store.name || "este borrador";
    if (!window.confirm(`¿Eliminar definitivamente ${label}? Esta acción no se puede deshacer.`)) return;

    setDeletingId(store.id);
    setError("");
    try {
      const response = await storeApiFetch(firebaseUser, `/api/stores/${store.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "reset" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo eliminar el borrador.");
      setStores((current) => current.filter((item) => item.id !== store.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el borrador.");
    } finally {
      setDeletingId(null);
    }
  }

  if (sessionLoading) {
    return (
      <main className="min-h-screen bg-gray-100 p-4">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow-md">
          <p className="text-gray-600">Comprobando sesión...</p>
        </div>
      </main>
    );
  }

  if (!firebaseUser) {
    return (
      <main className="min-h-screen bg-gray-100 p-4">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow-md">
          <h1 className="text-3xl font-bold text-gray-900">myStores</h1>
          <p className="mt-3 text-gray-600">Necesitas iniciar sesión para administrar tus tiendas.</p>
          <Link href="/login" className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">
            Iniciar sesión
          </Link>
          <div className="mt-5">
            <Link href="/marketplace" className="text-sm font-semibold text-blue-700 hover:underline">← Volver al Mercadito</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="rounded-2xl bg-white p-6 shadow-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">myStores</h1>
              <p className="mt-1 text-gray-600">Administra tus tiendas, continúa borradores y revisa el estado de cada solicitud.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/mystore/orders" className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700">
                Pedidos recibidos
              </Link>
              <button type="button" onClick={() => void createStore()} disabled={creating} className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-blue-400">
                {creating ? "Abriendo editor..." : "Crear mi tienda"}
              </button>
            </div>
          </div>
        </section>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}

        {storesLoading ? (
          <section className="rounded-2xl bg-white p-6 shadow-md"><p className="text-gray-600">Cargando tus tiendas...</p></section>
        ) : stores.length === 0 ? (
          <section className="rounded-2xl bg-white p-8 text-center shadow-md">
            <h2 className="text-xl font-bold text-gray-900">Todavía no tienes tiendas</h2>
            <p className="mx-auto mt-2 max-w-xl text-gray-600">Crea una tienda y entrarás directamente al editor completo para configurarla.</p>
            <button type="button" onClick={() => void createStore()} disabled={creating} className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-blue-400">
              {creating ? "Abriendo editor..." : "Crear mi tienda"}
            </button>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2">
            {stores.map((store) => (
              <article key={store.id} className="rounded-2xl bg-white p-5 shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{store.name || "Tienda en preparación"}</h2>
                    <p className="mt-1 text-sm text-gray-500">{store.slug ? `/marketplace/stores/${store.slug}` : "URL pública pendiente de aprobación"}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${storeStatusClasses(store.status)}`}>{storeStatusLabel(store.status)}</span>
                </div>

                <p className={store.description ? "mt-4 line-clamp-3 text-sm text-gray-700" : "mt-4 text-sm italic text-gray-500"}>
                  {store.description || "Continúa configurando esta tienda."}
                </p>

                {store.status === "changes_required" && store.reviewMessage && (
                  <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800"><strong>Cambios solicitados:</strong> {store.reviewMessage}</div>
                )}

                {store.status === "suspended" && store.suspensionReason && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><strong>Motivo de suspensión:</strong> {store.suspensionReason}</div>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href={`/mystore/${store.id}`} className="inline-flex rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white hover:bg-slate-800">
                    {store.status === "draft" ? "Continuar" : "Administrar"}
                  </Link>
                  {store.status === "active" && store.slug && (
                    <Link href={`/marketplace/stores/${store.slug}`} className="inline-flex rounded-xl border border-emerald-200 px-4 py-2.5 font-semibold text-emerald-700 hover:bg-emerald-50">
                      Ver tienda pública
                    </Link>
                  )}
                  {store.status === "draft" && (
                    <button
                      type="button"
                      onClick={() => void deleteDraft(store)}
                      disabled={deletingId === store.id}
                      className="rounded-xl border border-red-200 bg-white px-4 py-2.5 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === store.id ? "Eliminando..." : "Eliminar borrador"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}

        <div><Link href="/marketplace" className="text-sm font-semibold text-blue-700 hover:underline">← Volver al Mercadito</Link></div>
      </div>
    </main>
  );
}
