"use client";

import AdminQuickNav from "@/components/admin/AdminQuickNav";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { isAdminRole } from "@/lib/security/domain";
import { adminTabs } from "@/lib/store/adminClient";
import {
  storeApiFetch,
  storeStatusClasses,
  storeStatusLabel,
  type StoreApiRecord,
} from "@/lib/store/client";
import type { StoreStatus } from "@/lib/store/domain";
import { useSession } from "@/lib/useSession";

export default function AdminStoresPage() {
  const { firebaseUser, appUser, loading: sessionLoading } = useSession();
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<StoreStatus>("pending_review");
  const [stores, setStores] = useState<StoreApiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isAdmin = isAdminRole(appUser);

  useEffect(() => {
    if (sessionLoading) return;
    if (!firebaseUser) {
      router.replace("/login");
      return;
    }
    if (!isAdmin) router.replace("/marketplace");
  }, [firebaseUser, isAdmin, router, sessionLoading]);

  const loadStores = useCallback(async () => {
    if (!firebaseUser || !isAdmin) return;
    setLoading(true);
    setError("");

    try {
      const response = await storeApiFetch(
        firebaseUser,
        `/api/admin/stores?status=${selectedStatus}`,
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar las tiendas.");
      }
      setStores(Array.isArray(data.stores) ? data.stores : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar las tiendas.",
      );
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, isAdmin, selectedStatus]);

  useEffect(() => {
    if (firebaseUser && isAdmin) void loadStores();
  }, [firebaseUser, isAdmin, loadStores]);

  if (sessionLoading || !firebaseUser || !isAdmin) {
    return (
      <main className="min-h-screen bg-gray-100 p-4">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-6 shadow-md">
          <p className="text-gray-600">Verificando permisos...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto max-w-6xl space-y-5">
        <AdminQuickNav />
        <section className="rounded-2xl bg-white p-6 shadow-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link href="/admin" className="text-sm font-semibold text-blue-700 hover:underline">
                ← Centro de administración
              </Link>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">Administración de tiendas</h1>
              <p className="mt-1 text-gray-600">
                Abre la ficha íntegra de cada tienda antes de aprobar: categorías, vendedor, fotos, horarios, entrega y todos los productos.
              </p>
            </div>

            <Link
              href="/admin/categories"
              className="inline-flex w-fit rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 font-semibold text-blue-700 hover:bg-blue-100"
            >
              Administrar categorías
            </Link>
          </div>
        </section>

        <section className="overflow-x-auto rounded-2xl bg-white p-3 shadow-md">
          <div className="flex min-w-max gap-2">
            {adminTabs.map((tab) => {
              const active = selectedStatus === tab.status;
              return (
                <button
                  key={tab.status}
                  type="button"
                  onClick={() => setSelectedStatus(tab.status)}
                  className={
                    active
                      ? "rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
                      : "rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                  }
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <section className="rounded-2xl bg-white p-6 shadow-md">
            <p className="text-gray-600">Cargando tiendas...</p>
          </section>
        ) : stores.length === 0 ? (
          <section className="rounded-2xl bg-white p-8 text-center shadow-md">
            <p className="font-semibold text-gray-800">No hay tiendas en esta sección.</p>
          </section>
        ) : (
          <section className="grid gap-4 lg:grid-cols-2">
            {stores.map((store) => (
              <article key={store.id} className="rounded-2xl bg-white p-5 shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{store.name}</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {store.slug ? `/tienda/${store.slug}` : "URL pública pendiente"}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${storeStatusClasses(
                      store.status,
                    )}`}
                  >
                    {storeStatusLabel(store.status)}
                  </span>
                </div>

                {store.description ? (
                  <p className="mt-4 line-clamp-3 text-sm text-gray-700">{store.description}</p>
                ) : (
                  <p className="mt-4 text-sm italic text-gray-500">Sin descripción.</p>
                )}

                <div className="mt-4 rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
                  Propietario interno: <span className="font-mono">{store.ownerUid}</span>
                </div>

                <div className="mt-5">
                  <Link
                    href={`/admin/stores/${store.id}`}
                    className="inline-flex rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700"
                  >
                    Revisar tienda completa
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}

        <Link href="/marketplace" className="inline-block text-sm font-semibold text-blue-700 hover:underline">
          Volver al Mercadito
        </Link>
      </div>
    </main>
  );
}
