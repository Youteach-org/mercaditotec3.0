"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isSuperadminRole } from "@/lib/security/domain";
import { storeApiFetch } from "@/lib/store/client";
import { useSession } from "@/lib/useSession";

interface PendingItem {
  id: string;
  sellerName: string;
  title: string;
  description: string;
  imageUrl: string;
  location: string;
  priceType: "fixed" | "negotiable" | "ask";
  priceAmount: number | null;
  durationHours: number;
  createdAt: number;
  screeningReason: string | null;
}

export default function AdminDescubreManualPage() {
  const router = useRouter();
  const { firebaseUser, appUser, loading } = useSession();
  const superadmin = isSuperadminRole(appUser);
  const [items, setItems] = useState<PendingItem[]>([]);
  const [error, setError] = useState("");
  const [loadingItems, setLoadingItems] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    if (!firebaseUser) return;
    setLoadingItems(true);
    setError("");
    try {
      const response = await storeApiFetch(firebaseUser, "/api/admin/descubre", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo consultar la cola.");
      setItems(Array.isArray(data.listings) ? data.listings : []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo consultar la cola.");
    } finally {
      setLoadingItems(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) { router.replace("/login"); return; }
    if (!superadmin) { router.replace("/admin"); return; }
    void refresh();
  }, [loading, firebaseUser, superadmin, router, refresh]);

  async function decide(item: PendingItem, decision: "approved" | "blocked") {
    if (!firebaseUser || workingId) return;
    const reason = (reasons[item.id] ?? "").trim();
    if (decision === "blocked" && !reason) {
      setError("Indica el motivo del rechazo.");
      return;
    }
    if (!window.confirm(decision === "approved"
      ? "¿Ya revisaste la fotografía y el texto? Aprobar publicará este anuncio."
      : "¿Rechazar este anuncio y avisar al publicador?")) return;
    setWorkingId(item.id);
    setError("");
    try {
      const response = await storeApiFetch(firebaseUser, "/api/admin/descubre", {
        method: "POST",
        body: JSON.stringify({ id: item.id, decision, reason }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo completar la revisión.");
      setItems((previous) => previous.filter((current) => current.id !== item.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo completar la revisión.");
    } finally {
      setWorkingId("");
    }
  }

  if (loading || !firebaseUser || !superadmin) {
    return <main className="p-6 text-gray-900">Verificando permisos…</main>;
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 p-4 text-gray-900 sm:p-6">
      <Link href="/admin" className="font-bold text-[#123d82] underline">← Administración</Link>
      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-7">
        <h1 className="text-3xl font-black">Revisión manual de productos</h1>
        <p className="mt-2 text-base leading-relaxed">
          Aquí aparecen únicamente los anuncios que no pudieron analizarse por falta de cuota de IA.
          No se muestran al público hasta tu aprobación.
        </p>
        <button type="button" onClick={() => void refresh()} disabled={loadingItems}
          className="mt-4 rounded-lg border-2 border-[#123d82] bg-white px-5 py-3 font-bold text-[#123d82]">
          {loadingItems ? "Cargando…" : "Actualizar pendientes"}
        </button>
      </section>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 font-bold text-red-800">{error}</p>}
      {loadingItems ? (
        <p className="rounded-xl bg-white p-5">Cargando anuncios…</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl bg-white p-5">No hay productos pendientes de revisión manual.</p>
      ) : items.map((item) => (
        <article key={item.id} className="rounded-2xl border-2 border-[#123d82] bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-2xl font-black">{item.title}</h2>
          <p className="mt-1 text-sm font-semibold">Publicado por: {item.sellerName}</p>
          <div className="mt-4 grid gap-5 md:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
            <a href={item.imageUrl} target="_blank" rel="noopener noreferrer" aria-label={"Ver fotografía completa de " + item.title}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.imageUrl} alt={item.title} className="h-auto max-h-80 w-full rounded-lg bg-[#fff0c8] object-contain" />
              <span className="text-sm font-semibold underline">Ampliar fotografía ↗</span>
            </a>
            <div className="space-y-3 text-base">
              <p className="whitespace-pre-wrap break-words">{item.description}</p>
              <p><strong>Precio: </strong>{item.priceAmount == null ? "Preguntar precio" : item.priceAmount.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}</p>
              <p><strong>Entrega: </strong>{item.location}</p>
              <p><strong>Duración después de aprobar: </strong>{item.durationHours} horas</p>
              <p><strong>Motivo de revisión: </strong>{item.screeningReason ?? "Se agotó la cuota de IA."}</p>
              <label className="block font-bold" htmlFor={"review-reason-" + item.id}>Motivo del rechazo</label>
              <textarea id={"review-reason-" + item.id} rows={3} maxLength={180}
                placeholder="Obligatorio solo si rechazas el anuncio"
                value={reasons[item.id] ?? ""}
                onChange={(event) => setReasons((current) => ({ ...current, [item.id]: event.target.value }))}
                className="w-full rounded-lg border-2 border-gray-300 p-3 text-gray-900" />
              <div className="flex flex-wrap gap-3">
                <button type="button" disabled={Boolean(workingId)} onClick={() => void decide(item, "approved")}
                  className="rounded-xl bg-green-700 px-5 py-3 font-bold text-white disabled:opacity-50">
                  {workingId === item.id ? "Guardando…" : "Aprobar y publicar"}
                </button>
                <button type="button" disabled={Boolean(workingId)} onClick={() => void decide(item, "blocked")}
                  className="rounded-xl bg-red-700 px-5 py-3 font-bold text-white disabled:opacity-50">
                  Rechazar
                </button>
              </div>
            </div>
          </div>
        </article>
      ))}
    </main>
  );
}
