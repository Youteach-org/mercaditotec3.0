"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import StoreMediaSection from "./StoreMediaSection";
import StoreProductsSection from "./StoreProductsSection";
import StoreScheduleSection from "./StoreScheduleSection";
import StorefrontPreview from "./StorefrontPreview";
import {
  canOwnerEditStoreView,
  canOwnerSubmitStore,
  storeApiFetch,
  storeStatusClasses,
  storeStatusLabel,
  submitButtonLabel,
  type StoreApiRecord,
} from "@/lib/store/client";
import { validateStoreCompleteness } from "@/lib/store/completeness";
import type { StoreProductApiRecord } from "@/lib/store/productClient";
import type { StoreSchedule } from "@/lib/store/schedule";
import { useSession } from "@/lib/useSession";

function ErrorModal({ message, onClose }: { message: string; onClose: () => void }) {
  if (!message) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-xl font-black text-red-700">!</div>
        <h2 className="mt-4 text-xl font-bold text-gray-900">Tu tienda todavía no está lista</h2>
        <p className="mt-2 text-gray-600">{message}</p>
        <button type="button" onClick={onClose} autoFocus className="mt-5 w-full rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white">Entendido</button>
      </div>
    </div>
  );
}

function ApprovalInfoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-xl font-black text-blue-700">?</div>
        <h2 className="mt-4 text-xl font-bold text-gray-900">¿Por qué debe aprobarse mi tienda?</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          La revisión permite comprobar que la tienda, su producto inicial, sus imágenes y categorías cumplen las reglas del Mercadito antes de hacerse públicos. La URL pública se crea únicamente después de la aprobación.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link href="/terms" className="rounded-xl bg-blue-600 px-5 py-3 text-center font-semibold text-white hover:bg-blue-700">Ver términos y condiciones</Link>
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-300 px-5 py-3 font-semibold text-gray-700">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

export default function StoreBuilderClient() {
  const params = useParams<{ storeId: string }>();
  const router = useRouter();
  const { firebaseUser, appUser, loading: sessionLoading } = useSession();
  const storeId = String(params.storeId ?? "");

  const [store, setStore] = useState<StoreApiRecord | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [previewCover, setPreviewCover] = useState<string | null>(null);
  const [previewSchedule, setPreviewSchedule] = useState<StoreSchedule | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [products, setProducts] = useState<StoreProductApiRecord[]>([]);
  const [sellerName, setSellerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [infoSaving, setInfoSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const [approvalInfoOpen, setApprovalInfoOpen] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    if (!sessionLoading && !firebaseUser) router.replace("/login");
  }, [firebaseUser, router, sessionLoading]);

  const applyLoadedStore = useCallback((nextStore: StoreApiRecord) => {
    setStore(nextStore);
    setName(nextStore.name);
    setDescription(nextStore.description);
    setDeliveryLocation(nextStore.deliveryLocation ?? "");
    setPreviewLogo(nextStore.logoUrl);
    setPreviewCover(nextStore.coverUrl);
    setPreviewSchedule(nextStore.schedule);
  }, []);

  const loadStore = useCallback(async () => {
    if (!firebaseUser || !storeId) return;
    setLoading(true);
    setError("");
    try {
      const response = await storeApiFetch(firebaseUser, `/api/stores/${storeId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo cargar la tienda.");
      applyLoadedStore(data.store as StoreApiRecord);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la tienda.");
    } finally {
      setLoading(false);
    }
  }, [applyLoadedStore, firebaseUser, storeId]);

  useEffect(() => {
    if (!firebaseUser || hydrated.current) return;
    hydrated.current = true;
    try {
      const key = `mercaditotec3-store-draft-${storeId}`;
      const cached = window.sessionStorage.getItem(key);
      if (cached) {
        window.sessionStorage.removeItem(key);
        applyLoadedStore(JSON.parse(cached) as StoreApiRecord);
        setLoading(false);
        return;
      }
    } catch {
      // Se usa la API como respaldo.
    }
    void loadStore();
  }, [applyLoadedStore, firebaseUser, loadStore, storeId]);

  useEffect(() => {
    if (!firebaseUser) return;
    void (async () => {
      const fallback = appUser?.displayName || firebaseUser.displayName || "Tu perfil";
      try {
        const response = await storeApiFetch(firebaseUser, "/api/nickname");
        const data = await response.json();
        const nickname = data?.nicknames?.[firebaseUser.uid];
        setSellerName(typeof nickname === "string" && nickname.trim() ? nickname.trim() : fallback);
      } catch {
        setSellerName(fallback);
      }
    })();
  }, [appUser?.displayName, firebaseUser]);

  const acceptStoreChange = useCallback((nextStore: StoreApiRecord) => {
    setStore(nextStore);
    if (nextStore.logoUrl) setPreviewLogo(nextStore.logoUrl);
    if (nextStore.coverUrl) setPreviewCover(nextStore.coverUrl);
  }, []);

  const acceptProducts = useCallback((nextProducts: StoreProductApiRecord[]) => setProducts(nextProducts), []);
  const acceptSchedule = useCallback((nextSchedule: StoreSchedule) => setPreviewSchedule(nextSchedule), []);
  const acceptPreviewMedia = useCallback((kind: "logo" | "cover", url: string | null) => {
    if (kind === "logo") setPreviewLogo(url);
    else setPreviewCover(url);
  }, []);

  async function persistInformation(showError: boolean) {
    if (!firebaseUser || !store) return;
    const cleanName = name.trim();
    if (cleanName.length < 3 || cleanName.length > 60) {
      if (showError) setValidationMessage("El nombre de la tienda debe tener entre 3 y 60 caracteres.");
      return;
    }

    setInfoSaving(true);
    try {
      const response = await storeApiFetch(firebaseUser, `/api/stores/${store.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: cleanName, description, deliveryLocation }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar la información.");
      setStore(data.store as StoreApiRecord);
    } catch (saveError) {
      if (showError) setValidationMessage(saveError instanceof Error ? saveError.message : "No se pudo guardar la información.");
    } finally {
      setInfoSaving(false);
    }
  }

  async function saveAndReview() {
    if (!firebaseUser || !store || !previewSchedule) return;

    try {
      validateStoreCompleteness(
        { name: name.trim(), description, deliveryLocation, schedule: previewSchedule },
        products,
      );
    } catch (validationError) {
      setValidationMessage(validationError instanceof Error ? validationError.message : "Revisa los datos de la tienda.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const infoResponse = await storeApiFetch(firebaseUser, `/api/stores/${store.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim(), description, deliveryLocation }),
      });
      const infoData = await infoResponse.json();
      if (!infoResponse.ok) throw new Error(infoData.error ?? "Revisa la información de la tienda.");

      const scheduleResponse = await storeApiFetch(firebaseUser, `/api/stores/${store.id}/schedule`, {
        method: "PATCH",
        body: JSON.stringify({ schedule: previewSchedule, operationalMode: "automatic", manualOpen: null }),
      });
      const scheduleData = await scheduleResponse.json();
      if (!scheduleResponse.ok) throw new Error(scheduleData.error ?? "Revisa el horario de la tienda.");

      const response = await storeApiFetch(firebaseUser, `/api/stores/${store.id}/submit`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "La tienda todavía no está lista para revisión.");

      router.replace("/mystore");
    } catch (submitError) {
      setValidationMessage(submitError instanceof Error ? submitError.message : "No se pudo guardar la tienda.");
      setSubmitting(false);
    }
  }

  if (sessionLoading || loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-4">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-6 shadow-md"><p className="text-gray-600">Abriendo editor de tienda...</p></div>
      </main>
    );
  }

  if (!store || !firebaseUser) {
    return (
      <main className="min-h-screen bg-gray-100 p-4">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow-md">
          <h1 className="text-2xl font-bold text-gray-900">Tienda no disponible</h1>
          <p className="mt-2 text-red-700">{error || "No se encontró esta tienda."}</p>
          <Link href="/mystore" className="mt-5 inline-block font-semibold text-blue-700 hover:underline">Volver a Mis tiendas</Link>
        </div>
      </main>
    );
  }

  const editable = canOwnerEditStoreView(store.status);
  const canSubmit = canOwnerSubmitStore(store.status);
  const scheduleForPreview = previewSchedule ?? store.schedule;

  return (
    <main className="min-h-screen bg-gray-100 p-3 sm:p-4">
      <ErrorModal message={validationMessage} onClose={() => setValidationMessage("")} />
      <ApprovalInfoModal open={approvalInfoOpen} onClose={() => setApprovalInfoOpen(false)} />

      <div className="mx-auto max-w-[1500px] space-y-4">
        <section className="rounded-2xl bg-white p-5 shadow-md sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link href="/mystore" className="text-sm font-semibold text-blue-700 hover:underline">← Mis tiendas</Link>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">{name.trim() || "Nueva tienda"}</h1>
              <p className="mt-1 text-sm text-gray-500">{store.slug ? `/tienda/${store.slug}` : "La URL pública se asignará después de la aprobación."}</p>
            </div>
            <span className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${storeStatusClasses(store.status)}`}>{storeStatusLabel(store.status)}</span>
          </div>
        </section>

        {store.status === "pending_review" && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            <h2 className="font-bold">Tu tienda está en revisión</h2>
            <p className="mt-1 text-sm">Ya está guardada. Administración revisará información, horario, imágenes, producto inicial y categorías sugeridas antes de publicarla.</p>
          </div>
        )}

        {store.status === "changes_required" && store.reviewMessage && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-orange-900">
            <h2 className="font-bold">Requiere cambios</h2>
            <p className="mt-2 text-sm">{store.reviewMessage}</p>
          </div>
        )}

        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}

        <div className="grid gap-5 xl:grid-cols-[minmax(360px,0.7fr)_minmax(0,1.3fr)] xl:items-start">
          <div className="order-2 space-y-5 xl:order-1">
            <section className="rounded-2xl bg-white p-5 shadow-md sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold uppercase tracking-wide text-blue-600">1. Información</div>
                  <h2 className="mt-1 text-xl font-bold text-gray-900">Información de la tienda</h2>
                </div>
                {infoSaving && <span className="text-xs font-semibold text-gray-400">Guardando…</span>}
              </div>

              <label className="mt-5 block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">Nombre</span>
                <input value={name} onChange={(event) => setName(event.target.value)} onBlur={() => void persistInformation(false)} disabled={!editable} minLength={3} maxLength={60} placeholder="Nombre de tu tienda" className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500" />
              </label>

              <label className="mt-4 block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">Descripción</span>
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} onBlur={() => void persistInformation(false)} disabled={!editable} maxLength={600} rows={4} className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500" placeholder="Explica qué vendes y qué encontrarán en tu tienda." />
              </label>

              <label className="mt-4 block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">Entrego en</span>
                <textarea value={deliveryLocation} onChange={(event) => setDeliveryLocation(event.target.value)} onBlur={() => void persistInformation(false)} disabled={!editable} maxLength={240} rows={3} className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500" placeholder="Ej. Cafetería, edificio A y pasillo de laboratorios." />
                <span className="mt-1 block text-xs text-gray-400">Indica claramente en qué lugares del Tec acostumbras entregar.</span>
              </label>
              <p className="mt-2 text-xs text-gray-400">Los cambios se guardan automáticamente.</p>
            </section>

            <div className="relative">
              <div className="pointer-events-none absolute left-5 top-4 z-10 text-sm font-bold uppercase tracking-wide text-blue-600">2. Imagen</div>
              <div className="pt-5"><StoreMediaSection user={firebaseUser} store={store} editable={editable} onStoreChanged={acceptStoreChange} onPreviewMedia={acceptPreviewMedia} /></div>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute left-5 top-4 z-10 text-sm font-bold uppercase tracking-wide text-blue-600">3. Horario</div>
              <div className="pt-5"><StoreScheduleSection user={firebaseUser} store={store} editable={editable} onStoreChanged={acceptStoreChange} onScheduleChanged={acceptSchedule} /></div>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute left-5 top-4 z-10 text-sm font-bold uppercase tracking-wide text-blue-600">4. Producto inicial</div>
              <div className="pt-5"><StoreProductsSection user={firebaseUser} storeId={store.id} storeStatus={store.status} editable={editable} onProductsChanged={acceptProducts} /></div>
            </div>

            {canSubmit && (
              <section className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-6 shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Terminar tienda</h2>
                    <p className="mt-2 text-gray-700">Al guardar se comprobará nombre, descripción, lugar de entrega, horario y un producto inicial completo con foto, categoría y precio válido.</p>
                    <p className="mt-2 text-sm font-medium text-gray-600">Si está completa, entrará a revisión. La URL pública se generará únicamente después de la aprobación.</p>
                  </div>
                  <button type="button" onClick={() => setApprovalInfoOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-blue-300 bg-white px-3 py-2 text-sm font-bold text-blue-800 hover:bg-blue-100" aria-label="Por qué debe aprobarse mi tienda">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">?</span>
                    ¿Por qué debe aprobarse?
                  </button>
                </div>
                <button type="button" onClick={() => void saveAndReview()} disabled={submitting || infoSaving} className="mt-5 w-full rounded-xl bg-blue-600 px-6 py-3.5 font-bold text-white hover:bg-blue-700 disabled:bg-blue-400 sm:w-auto">
                  {submitting ? "Guardando..." : submitButtonLabel(store.status)}
                </button>
              </section>
            )}
          </div>

          <aside className="order-1 xl:order-2 xl:sticky xl:top-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
              <div>
                <h2 className="text-lg font-black text-gray-950">Vista previa de tu página!</h2>
                <span className="text-xs text-gray-500">Así la verán tus clientes.</span>
              </div>
              <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                <button type="button" onClick={() => setPreviewMode("desktop")} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${previewMode === "desktop" ? "bg-slate-900 text-white" : "text-slate-600"}`}>Escritorio</button>
                <button type="button" onClick={() => setPreviewMode("mobile")} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${previewMode === "mobile" ? "bg-slate-900 text-white" : "text-slate-600"}`}>Móvil</button>
              </div>
            </div>
            <StorefrontPreview
              name={name}
              sellerName={sellerName}
              description={description}
              deliveryLocation={deliveryLocation}
              logoUrl={previewLogo}
              coverUrl={previewCover}
              schedule={scheduleForPreview}
              products={products}
              previewMode={previewMode}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}
