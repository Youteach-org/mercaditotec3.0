"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

import StoreMediaSection from "@/components/store/StoreMediaSection";
import StoreProductsSection from "@/components/store/StoreProductsSection";
import StoreScheduleSection from "@/components/store/StoreScheduleSection";
import {
  canOwnerEditStoreView,
  canOwnerSubmitStore,
  storeApiFetch,
  storeStatusClasses,
  storeStatusLabel,
  submitButtonLabel,
  type StoreApiRecord,
} from "@/lib/store/client";
import { useSession } from "@/lib/useSession";

export default function StoreEditorPage() {
  const params = useParams<{ storeId: string }>();
  const router = useRouter();
  const { firebaseUser, loading: sessionLoading } = useSession();
  const storeId = String(params.storeId ?? "");

  const [store, setStore] = useState<StoreApiRecord | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!sessionLoading && !firebaseUser) router.replace("/login");
  }, [firebaseUser, router, sessionLoading]);

  const loadStore = useCallback(async () => {
    if (!firebaseUser || !storeId) return;
    setLoading(true);
    setError("");

    try {
      const response = await storeApiFetch(firebaseUser, `/api/stores/${storeId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo cargar la tienda.");

      const nextStore = data.store as StoreApiRecord;
      setStore(nextStore);
      setName(nextStore.name);
      setDescription(nextStore.description);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la tienda.");
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, storeId]);

  useEffect(() => {
    if (firebaseUser) void loadStore();
  }, [firebaseUser, loadStore]);

  function acceptStoreChange(nextStore: StoreApiRecord) {
    setStore(nextStore);
    setName(nextStore.name);
    setDescription(nextStore.description);
  }

  async function saveStore(event: FormEvent) {
    event.preventDefault();
    if (!firebaseUser || !store) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await storeApiFetch(firebaseUser, `/api/stores/${store.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, description }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudieron guardar los cambios.");
      acceptStoreChange(data.store as StoreApiRecord);
      setMessage("Información guardada.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
    }
  }

  async function submitForReview() {
    if (!firebaseUser || !store) return;
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await storeApiFetch(firebaseUser, `/api/stores/${store.id}/submit`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo enviar la tienda a revisión.");
      acceptStoreChange(data.store as StoreApiRecord);
      setMessage("Tu tienda completa fue enviada a revisión.");
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

  if (sessionLoading || loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-4">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow-md">
          <p className="text-gray-600">Cargando tienda...</p>
        </div>
      </main>
    );
  }

  if (!store || !firebaseUser) {
    return (
      <main className="min-h-screen bg-gray-100 p-4">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow-md">
          <h1 className="text-2xl font-bold text-gray-900">Tienda no disponible</h1>
          <p className="mt-2 text-red-700">{error || "No se encontró esta tienda."}</p>
          <Link href="/mystore" className="mt-5 inline-block font-semibold text-blue-700 hover:underline">
            Volver a Mis tiendas
          </Link>
        </div>
      </main>
    );
  }

  const editable = canOwnerEditStoreView(store.status);
  const canSubmit = canOwnerSubmitStore(store.status);

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="rounded-2xl bg-white p-6 shadow-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link href="/mystore" className="text-sm font-semibold text-blue-700 hover:underline">
                ← Mis tiendas
              </Link>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">{store.name}</h1>
              <p className="mt-1 text-sm text-gray-500">/tienda/{store.slug}</p>
            </div>
            <span className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${storeStatusClasses(store.status)}`}>
              {storeStatusLabel(store.status)}
            </span>
          </div>
        </section>

        {store.status === "pending_review" && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            <h2 className="font-bold">Tu tienda está en revisión</h2>
            <p className="mt-1 text-sm">
              La tienda completa quedó bloqueada mientras administración revisa información, imágenes, horario y productos.
            </p>
          </div>
        )}

        {store.status === "changes_required" && store.reviewMessage && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-orange-900">
            <h2 className="font-bold">Requiere cambios</h2>
            <p className="mt-2 text-sm">{store.reviewMessage}</p>
            <p className="mt-2 text-sm font-semibold">Corrige lo necesario y vuelve a enviar la tienda completa.</p>
          </div>
        )}

        {store.status === "suspended" && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900">
            <h2 className="font-bold">Tienda suspendida</h2>
            <p className="mt-2 text-sm">{store.suspensionReason || "Administración suspendió esta tienda."}</p>
            <p className="mt-2 text-sm font-medium">Puedes corregirla, pero solo administración puede reactivarla.</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>
        )}
        {message && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">{message}</div>
        )}

        <form onSubmit={saveStore} className="rounded-2xl bg-white p-6 shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold uppercase tracking-wide text-blue-600">1. Información</div>
              <h2 className="mt-1 text-xl font-bold text-gray-900">Información de la tienda</h2>
            </div>
          </div>

          <label className="mt-5 block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Nombre</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={!editable}
              required
              minLength={3}
              maxLength={60}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none disabled:bg-gray-100 disabled:text-gray-500"
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Descripción</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={!editable}
              maxLength={600}
              rows={6}
              className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none disabled:bg-gray-100 disabled:text-gray-500"
              placeholder="Explica qué vende tu tienda y qué pueden encontrar los compradores."
            />
          </label>

          {editable && (
            <button
              type="submit"
              disabled={saving}
              className="mt-5 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:bg-slate-500"
            >
              {saving ? "Guardando..." : "Guardar información"}
            </button>
          )}
        </form>

        <div className="relative">
          <div className="pointer-events-none absolute left-6 top-5 z-10 text-sm font-bold uppercase tracking-wide text-blue-600">2. Imagen</div>
          <div className="pt-5">
            <StoreMediaSection
              user={firebaseUser}
              store={store}
              editable={editable}
              onStoreChanged={acceptStoreChange}
            />
          </div>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute left-6 top-5 z-10 text-sm font-bold uppercase tracking-wide text-blue-600">3. Horario</div>
          <div className="pt-5">
            <StoreScheduleSection
              user={firebaseUser}
              store={store}
              editable={editable}
              onStoreChanged={acceptStoreChange}
            />
          </div>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute left-6 top-5 z-10 text-sm font-bold uppercase tracking-wide text-blue-600">4. Productos</div>
          <div className="pt-5">
            <StoreProductsSection user={firebaseUser} storeId={store.id} editable={editable} />
          </div>
        </div>

        {canSubmit && (
          <section className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-6 shadow-md">
            <div className="text-sm font-bold uppercase tracking-wide text-blue-700">5. Revisión</div>
            <h2 className="mt-1 text-2xl font-bold text-gray-900">Enviar tienda completa a revisión</h2>
            <p className="mt-2 text-gray-700">
              Antes de enviarla revisa información, horario y productos. Debes tener al menos un producto publicado con foto, categoría y precio válido.
            </p>
            <p className="mt-2 text-sm font-medium text-gray-600">
              Al enviarla se bloqueará la edición mientras administración la revisa.
            </p>
            <button
              type="button"
              onClick={() => void submitForReview()}
              disabled={submitting || saving}
              className="mt-5 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white disabled:bg-blue-400"
            >
              {submitting ? "Enviando..." : submitButtonLabel(store.status)}
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
