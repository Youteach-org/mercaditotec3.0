"use client";

import Link from "next/link";
import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  canOwnerEditStoreView,
  canOwnerSubmitStore,
  storeApiFetch,
  storeStatusClasses,
  storeStatusLabel,
  submitButtonLabel,
  type StoreApiRecord,
} from "@/lib/store/client";

import {
  useSession,
} from "@/lib/useSession";

export default function StoreEditorPage() {
  const params = useParams<{
    storeId: string;
  }>();

  const router = useRouter();

  const {
    firebaseUser,
    loading: sessionLoading,
  } = useSession();

  const storeId =
    String(params.storeId ?? "");

  const [store, setStore] =
    useState<StoreApiRecord | null>(
      null,
    );

  const [name, setName] =
    useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

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

  const loadStore =
    useCallback(async () => {
      if (
        !firebaseUser ||
        !storeId
      ) {
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response =
          await storeApiFetch(
            firebaseUser,
            `/api/stores/${storeId}`,
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ??
              "No se pudo cargar la tienda.",
          );
        }

        const nextStore =
          data.store as StoreApiRecord;

        setStore(nextStore);
        setName(nextStore.name);
        setDescription(
          nextStore.description,
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar la tienda.",
        );
      } finally {
        setLoading(false);
      }
    }, [
      firebaseUser,
      storeId,
    ]);

  useEffect(() => {
    if (firebaseUser) {
      void loadStore();
    }
  }, [
    firebaseUser,
    loadStore,
  ]);

  async function saveStore(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      !firebaseUser ||
      !store
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response =
        await storeApiFetch(
          firebaseUser,
          `/api/stores/${store.id}`,
          {
            method: "PATCH",
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
            "No se pudieron guardar los cambios.",
        );
      }

      const nextStore =
        data.store as StoreApiRecord;

      setStore(nextStore);
      setName(nextStore.name);
      setDescription(
        nextStore.description,
      );

      setMessage(
        "Cambios guardados.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudieron guardar los cambios.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function submitForReview() {
    if (
      !firebaseUser ||
      !store
    ) {
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response =
        await storeApiFetch(
          firebaseUser,
          `/api/stores/${store.id}/submit`,
          {
            method: "POST",
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "No se pudo enviar la tienda a revisión.",
        );
      }

      const nextStore =
        data.store as StoreApiRecord;

      setStore(nextStore);

      setMessage(
        "Tu tienda fue enviada a revisión.",
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo enviar la tienda a revisión.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (
    sessionLoading ||
    loading
  ) {
    return (
      <main className="min-h-screen bg-gray-100 p-4">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-md">
          <p className="text-gray-600">
            Cargando tienda...
          </p>
        </div>
      </main>
    );
  }

  if (!store) {
    return (
      <main className="min-h-screen bg-gray-100 p-4">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-md">
          <h1 className="text-2xl font-bold text-gray-900">
            Tienda no disponible
          </h1>

          <p className="mt-2 text-red-700">
            {error ||
              "No se encontró esta tienda."}
          </p>

          <Link
            href="/mystore"
            className="mt-5 inline-block font-semibold text-blue-700 hover:underline"
          >
            Volver a Mis tiendas
          </Link>
        </div>
      </main>
    );
  }

  const editable =
    canOwnerEditStoreView(
      store.status,
    );

  const canSubmit =
    canOwnerSubmitStore(
      store.status,
    );

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto max-w-4xl space-y-5">
        <section className="rounded-2xl bg-white p-6 shadow-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link
                href="/mystore"
                className="text-sm font-semibold text-blue-700 hover:underline"
              >
                ← Mis tiendas
              </Link>

              <h1 className="mt-2 text-3xl font-bold text-gray-900">
                {store.name}
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                /tienda/{store.slug}
              </p>
            </div>

            <span
              className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${storeStatusClasses(
                store.status,
              )}`}
            >
              {storeStatusLabel(
                store.status,
              )}
            </span>
          </div>
        </section>

        {store.status ===
          "pending_review" && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            <h2 className="font-bold">
              Tu tienda está en revisión
            </h2>

            <p className="mt-1 text-sm">
              Mientras administración la revisa, la información queda bloqueada para evitar cambios durante la evaluación.
            </p>
          </div>
        )}

        {store.status ===
          "changes_required" &&
          store.reviewMessage && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-orange-900">
              <h2 className="font-bold">
                Requiere cambios
              </h2>

              <p className="mt-2 text-sm">
                {store.reviewMessage}
              </p>
            </div>
          )}

        {store.status ===
          "suspended" && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900">
              <h2 className="font-bold">
                Tienda suspendida
              </h2>

              <p className="mt-2 text-sm">
                {store.suspensionReason ||
                  "Administración suspendió esta tienda."}
              </p>

              <p className="mt-2 text-sm font-medium">
                Puedes corregir su información, pero solo administración puede reactivarla.
              </p>
            </div>
          )}

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

        <form
          onSubmit={saveStore}
          className="rounded-2xl bg-white p-6 shadow-md"
        >
          <h2 className="text-xl font-bold text-gray-900">
            Información de la tienda
          </h2>

          <label className="mt-5 block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">
              Nombre
            </span>

            <input
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value,
                )
              }
              disabled={!editable}
              required
              minLength={3}
              maxLength={60}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none disabled:bg-gray-100 disabled:text-gray-500"
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
              disabled={!editable}
              maxLength={600}
              rows={6}
              className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none disabled:bg-gray-100 disabled:text-gray-500"
            />
          </label>

          <div className="mt-6 flex flex-wrap gap-3">
            {editable && (
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:bg-slate-500"
              >
                {saving
                  ? "Guardando..."
                  : "Guardar cambios"}
              </button>
            )}

            {canSubmit && (
              <button
                type="button"
                onClick={
                  submitForReview
                }
                disabled={
                  submitting ||
                  saving
                }
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:bg-blue-400"
              >
                {submitting
                  ? "Enviando..."
                  : submitButtonLabel(
                      store.status,
                    )}
              </button>
            )}
          </div>
        </form>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-gray-900">
            Siguiente etapa
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            Logo, portada, horarios y productos se incorporarán después de completar y probar este núcleo de tiendas.
          </p>
        </section>
      </div>
    </main>
  );
}
