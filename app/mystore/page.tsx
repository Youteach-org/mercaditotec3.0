"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  storeApiFetch,
  storeStatusClasses,
  storeStatusLabel,
  type StoreApiRecord,
} from "@/lib/store/client";

import {
  useSession,
} from "@/lib/useSession";

const LEGACY_TEST_STORE_ID = "SUgQWJTdrOHmFz4Vcde9";

export default function MyStorePage() {
  const {
    firebaseUser,
    loading: sessionLoading,
  } = useSession();

  const router = useRouter();

  const [stores, setStores] =
    useState<StoreApiRecord[]>([]);

  const [storesLoading, setStoresLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [creating, setCreating] =
    useState(false);

  const [legacyResetAttempted, setLegacyResetAttempted] =
    useState(false);

  const [resettingLegacy, setResettingLegacy] =
    useState(false);

  useEffect(() => {
    if (
      !sessionLoading &&
      !firebaseUser
    ) {
      router.replace("/login");
    }
  }, [
    firebaseUser,
    router,
    sessionLoading,
  ]);

  const loadStores =
    useCallback(async () => {
      if (!firebaseUser) {
        return;
      }

      setStoresLoading(true);
      setError("");

      try {
        const response =
          await storeApiFetch(
            firebaseUser,
            "/api/stores",
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ??
              "No se pudieron cargar tus tiendas.",
          );
        }

        setStores(
          Array.isArray(data.stores)
            ? data.stores
            : [],
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudieron cargar tus tiendas.",
        );
      } finally {
        setStoresLoading(false);
      }
    }, [firebaseUser]);

  useEffect(() => {
    if (firebaseUser) {
      void loadStores();
    }
  }, [
    firebaseUser,
    loadStores,
  ]);

  useEffect(() => {
    if (
      !firebaseUser ||
      storesLoading ||
      legacyResetAttempted
    ) {
      return;
    }

    const legacyStore = stores.find(
      (store) => store.id === LEGACY_TEST_STORE_ID,
    );

    if (!legacyStore) {
      setLegacyResetAttempted(true);
      return;
    }

    setLegacyResetAttempted(true);
    setResettingLegacy(true);
    setError("");

    void (async () => {
      try {
        const response = await storeApiFetch(
          firebaseUser,
          `/api/stores/${LEGACY_TEST_STORE_ID}`,
          {
            method: "PATCH",
            body: JSON.stringify({ action: "reset" }),
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ??
              "No se pudo reiniciar la tienda de prueba.",
          );
        }

        await loadStores();
      } catch (resetError) {
        setError(
          resetError instanceof Error
            ? resetError.message
            : "No se pudo reiniciar la tienda de prueba.",
        );
      } finally {
        setResettingLegacy(false);
      }
    })();
  }, [
    firebaseUser,
    legacyResetAttempted,
    loadStores,
    stores,
    storesLoading,
  ]);

  async function createStore() {
    if (!firebaseUser || creating || resettingLegacy) {
      return;
    }

    setCreating(true);
    setError("");

    try {
      const response =
        await storeApiFetch(
          firebaseUser,
          "/api/stores",
          {
            method: "POST",
            body: JSON.stringify({
              bootstrap: true,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "No se pudo iniciar la tienda.",
        );
      }

      router.push(
        `/mystore/${data.store.id}`,
      );
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "No se pudo iniciar la tienda.",
      );
      setCreating(false);
    }
  }

  if (
    sessionLoading ||
    (!firebaseUser &&
      !sessionLoading)
  ) {
    return (
      <main className="min-h-screen bg-gray-100 p-4">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow-md">
          <p className="text-gray-600">
            Cargando...
          </p>
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
              <h1 className="text-3xl font-bold text-gray-900">
                Mis tiendas
              </h1>

              <p className="mt-1 text-gray-600">
                Crea una tienda y configúrala completa antes de enviarla a revisión.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void createStore()}
              disabled={creating || resettingLegacy}
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-blue-400"
            >
              {resettingLegacy
                ? "Reiniciando proceso..."
                : creating
                  ? "Abriendo editor..."
                  : "Crear mi tienda"}
            </button>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {resettingLegacy && (
          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm font-medium text-blue-800">
            Reiniciando la tienda de prueba anterior para comenzar desde cero...
          </section>
        )}

        {storesLoading ? (
          <section className="rounded-2xl bg-white p-6 shadow-md">
            <p className="text-gray-600">
              Cargando tus tiendas...
            </p>
          </section>
        ) : stores.length === 0 ? (
          <section className="rounded-2xl bg-white p-8 text-center shadow-md">
            <h2 className="text-xl font-bold text-gray-900">
              Todavía no tienes tiendas
            </h2>

            <p className="mx-auto mt-2 max-w-xl text-gray-600">
              Al crear tu tienda entrarás directamente al editor completo para configurar nombre, imágenes, horario y productos.
            </p>

            <button
              type="button"
              onClick={() => void createStore()}
              disabled={creating || resettingLegacy}
              className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-blue-400"
            >
              {resettingLegacy
                ? "Reiniciando proceso..."
                : creating
                  ? "Abriendo editor..."
                  : "Crear mi tienda"}
            </button>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2">
            {stores.map(
              (store) => (
                <article
                  key={store.id}
                  className="rounded-2xl bg-white p-5 shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {store.name}
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        /tienda/{store.slug}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${storeStatusClasses(
                        store.status,
                      )}`}
                    >
                      {storeStatusLabel(
                        store.status,
                      )}
                    </span>
                  </div>

                  {store.description ? (
                    <p className="mt-4 line-clamp-3 text-sm text-gray-700">
                      {store.description}
                    </p>
                  ) : (
                    <p className="mt-4 text-sm italic text-gray-500">
                      Completa la información de esta tienda.
                    </p>
                  )}

                  {store.status ===
                    "changes_required" &&
                    store.reviewMessage && (
                      <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
                        <strong>
                          Cambios solicitados:
                        </strong>{" "}
                        {store.reviewMessage}
                      </div>
                    )}

                  {store.status ===
                    "suspended" &&
                    store.suspensionReason && (
                      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                        <strong>
                          Motivo de suspensión:
                        </strong>{" "}
                        {store.suspensionReason}
                      </div>
                    )}

                  <div className="mt-5">
                    <Link
                      href={`/mystore/${store.id}`}
                      className="inline-flex rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white hover:bg-slate-800"
                    >
                      Administrar
                    </Link>
                  </div>
                </article>
              ),
            )}
          </section>
        )}

        <div>
          <Link
            href="/"
            className="text-sm font-semibold text-blue-700 hover:underline"
          >
            ← Volver al Mercadito
          </Link>
        </div>
      </div>
    </main>
  );
}
