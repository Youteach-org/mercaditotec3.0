"use client";

import type { User } from "firebase/auth";
import { useState } from "react";

import { storeApiFetch, type StoreApiRecord } from "@/lib/store/client";
import { uploadStoreMedia } from "@/lib/store/mediaClient";

interface Props {
  user: User;
  store: StoreApiRecord;
  editable: boolean;
  onStoreChanged: (store: StoreApiRecord) => void;
  onPreviewMedia?: (kind: "logo" | "cover", url: string | null) => void;
}

export default function StoreMediaSection({
  user,
  store,
  editable,
  onStoreChanged,
  onPreviewMedia,
}: Props) {
  const [working, setWorking] = useState<"logo" | "cover" | null>(null);
  const [error, setError] = useState("");

  async function choose(kind: "logo" | "cover", file: File | null) {
    if (!file || !editable) return;

    const localPreview = URL.createObjectURL(file);
    onPreviewMedia?.(kind, localPreview);
    setWorking(kind);
    setError("");

    try {
      const url = await uploadStoreMedia({ ownerUid: user.uid, storeId: store.id, kind, file });
      const response = await storeApiFetch(user, `/api/stores/${store.id}/media`, {
        method: "PATCH",
        body: JSON.stringify({ kind, url }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar la imagen.");
      onPreviewMedia?.(kind, url);
      onStoreChanged(data.store as StoreApiRecord);
    } catch (uploadError) {
      onPreviewMedia?.(kind, kind === "logo" ? store.logoUrl : store.coverUrl);
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "No se pudo guardar la imagen.",
      );
    } finally {
      setWorking(null);
      URL.revokeObjectURL(localPreview);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-md sm:p-6">
      <h2 className="text-xl font-bold text-gray-900">Imágenes visibles en Mercadito</h2>
      <p className="mt-1 text-sm text-gray-600">
        Selecciona el logo circular y la portada que se recorta dentro de la nube. Son exactamente las dos imágenes que aparecen en tu tarjeta del Marketplace.
      </p>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-5 grid gap-5 md:grid-cols-[160px_1fr]">
        <div>
          <div className="text-sm font-semibold text-gray-700">Logo circular</div>
          <div className="mt-2 flex h-32 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
            {store.logoUrl ? (
              <img src={store.logoUrl} alt="Logo de la tienda" className="h-full w-full bg-white object-contain" />
            ) : (
              <span className="text-sm text-gray-400">Sin logo</span>
            )}
          </div>
          {editable && (
            <label className="mt-3 block cursor-pointer rounded-xl border border-gray-300 px-4 py-2.5 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50">
              {working === "logo" ? "Subiendo..." : "Elegir logo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                disabled={working !== null}
                onChange={(event) => void choose("logo", event.target.files?.[0] ?? null)}
              />
            </label>
          )}
        </div>

        <div>
          <div className="text-sm font-semibold text-gray-700">Portada dentro de la nube</div>
          <div className="mt-2 flex h-32 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
            {store.coverUrl ? (
              <img src={store.coverUrl} alt="Portada de la tienda" className="h-full w-full bg-white object-contain" />
            ) : (
              <span className="text-sm text-gray-400">Sin portada</span>
            )}
          </div>
          {editable && (
            <label className="mt-3 block cursor-pointer rounded-xl border border-gray-300 px-4 py-2.5 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50">
              {working === "cover" ? "Subiendo..." : "Elegir portada"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                disabled={working !== null}
                onChange={(event) => void choose("cover", event.target.files?.[0] ?? null)}
              />
            </label>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-500">Máximo 1 MB por imagen.</p>
    </section>
  );
}
