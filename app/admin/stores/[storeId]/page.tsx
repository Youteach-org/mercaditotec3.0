"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import AdminStoreReviewProducts from "@/components/store/AdminStoreReviewProducts";
import {
  actionsForStoreStatus,
  adminActionLabel,
  apiStatusForAction,
  type AdminStoreAction,
} from "@/lib/store/adminClient";
import {
  storeApiFetch,
  storeStatusClasses,
  storeStatusLabel,
  type StoreApiRecord,
} from "@/lib/store/client";
import { useSession } from "@/lib/useSession";

export default function AdminStoreDetailPage() {
  const params = useParams<{ storeId: string }>();
  const router = useRouter();
  const { firebaseUser, appUser, loading: sessionLoading } = useSession();
  const storeId = String(params.storeId ?? "");
  const isAdmin = appUser?.role === "admin";

  const [store, setStore] = useState<StoreApiRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dialogAction, setDialogAction] = useState<AdminStoreAction | null>(null);
  const [adminMessage, setAdminMessage] = useState("");

  useEffect(() => {
    if (sessionLoading) return;
    if (!firebaseUser) {
      router.replace("/login");
      return;
    }
    if (!isAdmin) router.replace("/marketplace");
  }, [firebaseUser, isAdmin, router, sessionLoading]);

  const loadStore = useCallback(async () => {
    if (!firebaseUser || !isAdmin || !storeId) return;

    setLoading(true);
    setError("");

    try {
      const response = await storeApiFetch(
        firebaseUser,
        `/api/admin/stores/${storeId}`,
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar la tienda.");
      }
      setStore(data.store as StoreApiRecord);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar la tienda.",
      );
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, isAdmin, storeId]);

  useEffect(() => {
    if (firebaseUser && isAdmin) void loadStore();
  }, [firebaseUser, isAdmin, loadStore]);

  async function executeAction(
    action: AdminStoreAction,
    actionMessage?: string,
  ) {
    if (!firebaseUser || !store) return;

    setWorking(true);
    setError("");
    setMessage("");

    try {
      const response = await storeApiFetch(
        firebaseUser,
        `/api/admin/stores/${store.id}/status`,
        {
          method: "POST",
          body: JSON.stringify({
            status: apiStatusForAction(action),
            message: actionMessage,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cambiar el estado de la tienda.");
      }

      setStore(data.store as StoreApiRecord);
      setDialogAction(null);
      setAdminMessage("");
      setMessage(
        action === "approve"
          ? "Tienda aprobada. La URL pública ya fue asignada."
          : action === "changes_required"
            ? "La tienda fue devuelta para correcciones."
            : action === "suspend"
              ? "Tienda suspendida."
              : "Tienda reactivada.",
      );
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "No se pudo cambiar el estado.",
      );
    } finally {
      setWorking(false);
    }
  }

  function requestAction(action: AdminStoreAction) {
    if (action === "approve" || action === "reactivate") {
      void executeAction(action);
      return;
    }
    setAdminMessage("");
    setDialogAction(action);
  }

  if (sessionLoading || loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-4">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-md">
          Cargando tienda...
        </div>
      </main>
    );
  }

  if (!store || !firebaseUser) {
    return (
      <main className="min-h-screen bg-gray-100 p-4">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-md">
          <h1 className="text-2xl font-bold">Tienda no disponible</h1>
          <p className="mt-2 text-red-700">{error}</p>
          <Link
            href="/admin/stores"
            className="mt-4 inline-block font-semibold text-blue-700"
          >
            Volver
          </Link>
        </div>
      </main>
    );
  }

  const actions = actionsForStoreStatus(store.status);

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto max-w-4xl space-y-5">
        <section className="rounded-2xl bg-white p-6 shadow-md">
          <Link
            href="/admin/stores"
            className="text-sm font-semibold text-blue-700 hover:underline"
          >
            ← Administración de tiendas
          </Link>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{store.name}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {store.slug
                  ? `/tienda/${store.slug}`
                  : "URL pública pendiente de aprobación"}
              </p>
            </div>

            <span
              className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${storeStatusClasses(
                store.status,
              )}`}
            >
              {storeStatusLabel(store.status)}
            </span>
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

        <section className="rounded-2xl bg-white p-6 shadow-md">
          <h2 className="text-xl font-bold text-gray-900">Información para revisión</h2>

          <dl className="mt-5 space-y-4">
            <div>
              <dt className="text-sm font-semibold text-gray-500">Nombre</dt>
              <dd className="mt-1 text-gray-900">{store.name}</dd>
            </div>

            <div>
              <dt className="text-sm font-semibold text-gray-500">Descripción</dt>
              <dd className="mt-1 whitespace-pre-wrap text-gray-900">
                {store.description || "Sin descripción."}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-semibold text-gray-500">Propietario interno</dt>
              <dd className="mt-1 break-all font-mono text-sm text-gray-700">
                {store.ownerUid}
              </dd>
            </div>

            {store.reviewMessage && (
              <div>
                <dt className="text-sm font-semibold text-orange-700">Cambios solicitados</dt>
                <dd className="mt-1 text-orange-900">{store.reviewMessage}</dd>
              </div>
            )}

            {store.suspensionReason && (
              <div>
                <dt className="text-sm font-semibold text-red-700">Motivo de suspensión</dt>
                <dd className="mt-1 text-red-900">{store.suspensionReason}</dd>
              </div>
            )}
          </dl>
        </section>

        <AdminStoreReviewProducts user={firebaseUser} storeId={store.id} />

        {actions.length > 0 && (
          <section className="rounded-2xl bg-white p-6 shadow-md">
            <h2 className="text-xl font-bold text-gray-900">Acciones administrativas</h2>
            <p className="mt-1 text-sm text-gray-600">
              Al aprobar una tienda pendiente se asignará su URL pública y se incorporarán sus categorías sugeridas a la lista general.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              {actions.map((action) => (
                <button
                  key={action}
                  type="button"
                  disabled={working}
                  onClick={() => requestAction(action)}
                  className={
                    action === "approve" || action === "reactivate"
                      ? "rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white disabled:bg-emerald-400"
                      : action === "suspend"
                        ? "rounded-xl bg-red-600 px-5 py-3 font-semibold text-white disabled:bg-red-400"
                        : "rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white disabled:bg-orange-300"
                  }
                >
                  {adminActionLabel(action)}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {dialogAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void executeAction(dialogAction, adminMessage);
            }}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-2xl font-bold text-gray-900">
              {dialogAction === "suspend" ? "Suspender tienda" : "Solicitar cambios"}
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              {dialogAction === "suspend"
                ? "Indica el motivo de la suspensión. El vendedor podrá verlo."
                : "Explica claramente qué debe corregir el vendedor."}
            </p>

            <textarea
              value={adminMessage}
              onChange={(event) => setAdminMessage(event.target.value)}
              required
              rows={5}
              maxLength={600}
              className="mt-4 w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none"
            />

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={working}
                onClick={() => {
                  setDialogAction(null);
                  setAdminMessage("");
                }}
                className="rounded-xl border border-gray-300 px-4 py-3 font-semibold text-gray-700"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={working || !adminMessage.trim()}
                className={
                  dialogAction === "suspend"
                    ? "rounded-xl bg-red-600 px-5 py-3 font-semibold text-white disabled:bg-red-300"
                    : "rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white disabled:bg-orange-300"
                }
              >
                {working ? "Procesando..." : "Confirmar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
