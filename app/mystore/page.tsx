"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
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

export default function MyStorePage() {
  const {
    firebaseUser,
    loading: sessionLoading,
  } = useSession();

  const router = useRouter();

  const [stores, setStores] =
    useState<StoreApiRecord[]>([]);

  const [
    storesLoading,
    setStoresLoading,
  ] = useState(true);

  const [error, setError] =
    useState("");

  const [
    createOpen,
    setCreateOpen,
  ] = useState(false);

  const [name, setName] =
    useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [creating, setCreating] =
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

  async function createStore(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!firebaseUser) {
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
              name,
              description,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "No se pudo crear la tienda.",
        );
      }

      setName("");
      setDescription("");
      setCreateOpen(false);

      router.push(
        `/mystore/${data.store.id}`,
      );
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "No se pudo crear la tienda.",
      );
    } finally {
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
                Crea y administra únicamente las tiendas que quieras usar para vender.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setCreateOpen(true)
              }
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Crear mi tienda
            </button>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
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
              MercaditoTec3 no crea una tienda automáticamente. Si quieres vender algo, crea tu primera tienda y prepárala antes de enviarla a revisión.
            </p>

            <button
              type="button"
              onClick={() =>
                setCreateOpen(true)
              }
              className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Crear mi tienda
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
                      Sin descripción todavía.
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
            href="/marketplace"
            className="text-sm font-semibold text-blue-700 hover:underline"
          >
            Volver al Mercadito
          </Link>
        </div>
      </div>

      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (
              event.currentTarget ===
              event.target
            ) {
              setCreateOpen(false);
            }
          }}
        >
          <form
            onSubmit={createStore}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-2xl font-bold text-gray-900">
              Crear mi tienda
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              Primero crea el espacio de tu tienda. Después podrás prepararlo antes de enviarlo a revisión.
            </p>

            <label className="mt-5 block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">
                Nombre de la tienda
              </span>

              <input
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value,
                  )
                }
                required
                minLength={3}
                maxLength={60}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
                placeholder="Ej. Dulces Fer"
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">
                Descripción
              </span>

              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value,
                  )
                }
                maxLength={600}
                rows={4}
                className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
                placeholder="¿Qué venderás en esta tienda?"
              />
            </label>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setCreateOpen(false)
                }
                disabled={creating}
                className="rounded-xl border border-gray-300 px-4 py-3 font-semibold text-gray-700"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={creating}
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:bg-blue-400"
              >
                {creating
                  ? "Creando..."
                  : "Crear tienda"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
