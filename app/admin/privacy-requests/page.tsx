"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";
import { storeApiFetch } from "@/lib/store/client";
import { isSuperadminRole } from "@/lib/security/domain";
import { arcoLabels, arcoStatusLabels, type ArcoType, type ArcoStatus } from "@/lib/privacy/arco";

type PrivacyRequest = {
  id: string; uid: string; email: string; type: ArcoType;
  details: string; status: ArcoStatus; response: string; createdAt: string;
};

export default function AdminPrivacyRequestsPage() {
  const router = useRouter();
  const { firebaseUser, appUser, loading } = useSession();
  const superadmin = isSuperadminRole(appUser);
  const [rows, setRows] = useState<PrivacyRequest[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    if (!firebaseUser || !superadmin) return;
    setError("");
    try {
      const response = await storeApiFetch(firebaseUser, "/api/admin/privacy-requests", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "No se pudo cargar la cola.");
      setRows(result.requests ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la cola.");
    }
  }, [firebaseUser, superadmin]);

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) router.replace("/login");
    else if (!superadmin) router.replace("/admin");
    else void refresh();
  }, [firebaseUser, superadmin, loading, router, refresh]);

  async function update(id: string, status: "in_review" | "resolved" | "not_procedent") {
    if (!firebaseUser || busy) return;
    if (status !== "in_review" && !(drafts[id] ?? "").trim()) {
      setError("Antes de responder, redacta una explicación verificable para el usuario.");
      return;
    }
    if (status === "resolved" && rows.find(row => row.id === id)?.type === "cancellation" &&
      !window.confirm("¿Comprobaste que el procedimiento de cancelación/retención ya fue realizado? Cambiar el estado NO elimina datos por sí solo.")) return;
    setBusy(id);
    setError("");
    setNotice("");
    try {
      const result = await storeApiFetch(firebaseUser, `/api/admin/privacy-requests/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status, response: drafts[id] ?? "" }),
      });
      const body = await result.json().catch(() => ({}));
      if (!result.ok) throw new Error(body.error ?? "No se pudo actualizar.");
      setNotice("Estado y respuesta guardados; el titular los verá en su historial.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar.");
    } finally {
      setBusy("");
    }
  }

  if (loading || !firebaseUser || !superadmin) {
    return <main className="min-h-screen bg-[#fff9ee] p-5">Verificando permisos de administración…</main>;
  }

  return (
    <main className="min-h-screen bg-[#fff9ee] px-4 py-7 text-[#123d82] sm:px-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <Link href="/admin" className="font-bold">← Volver a Administración</Link>
        <header className="rounded-2xl bg-[#123d82] p-6 text-white">
          <h1 className="text-3xl font-black">Solicitudes de privacidad ARCO</h1>
          <p className="mt-2 text-sm">Acceso exclusivo a superadministración. No reveles datos de los titulares; verifica y documenta cada respuesta.</p>
        </header>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4">
          <p className="font-bold">{rows.filter(row => row.status === "received" || row.status === "in_review").length} solicitudes por atender</p>
          <button onClick={() => void refresh()} className="rounded-xl bg-[#ffd54c] px-4 py-2 font-black">Actualizar lista</button>
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-4 font-bold text-red-800">{error}</p>}
        {notice && <p role="status" className="rounded-lg bg-green-50 p-4 font-bold text-green-800">{notice}</p>}
        {rows.map(row => (
          <article key={row.id} className="rounded-2xl border border-[#e8cf9d] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="text-xl font-black">{arcoLabels[row.type]}</h2>
              <span className="rounded-full bg-[#fff0cf] px-3 py-1 text-sm font-bold">{arcoStatusLabels[row.status]}</span>
            </div>
            <p className="mt-2 break-all text-sm text-slate-700">{row.email} · {new Date(row.createdAt).toLocaleString("es-MX")} · Folio: {row.id.slice(-28)}</p>
            <p className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-[#fff9ee] p-3 text-sm text-slate-800">{row.details || "Sin explicación adicional."}</p>
            {row.response && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-[#fff9ee] p-3 text-sm"><strong>Respuesta registrada:</strong> {row.response}</p>}
            {(row.status === "received" || row.status === "in_review") && (
              <div className="mt-4 space-y-3">
                <label className="block text-sm font-bold" htmlFor={`reply-${row.id}`}>Respuesta al titular (obligatoria para cerrar)</label>
                <textarea id={`reply-${row.id}`} maxLength={1600} rows={3}
                  value={drafts[row.id] ?? ""} onChange={event => setDrafts(previous => ({ ...previous, [row.id]: event.target.value }))}
                  className="w-full rounded-xl border border-[#e8cf9d] p-3 text-slate-900"
                  placeholder="Indica qué se verificó, acciones aplicadas y, si no procede, el fundamento de la decisión…" />
                <p className="text-xs text-slate-600">Responder «resuelta» no elimina cuentas ni ejecuta cambios de datos: las operaciones deben realizarse por separado.</p>
                <div className="flex flex-wrap gap-2">
                  {row.status === "received" && <button disabled={Boolean(busy)} onClick={() => void update(row.id, "in_review")} className="rounded-xl bg-[#ffd54c] px-4 py-2 font-bold">Tomar para revisión</button>}
                  <button disabled={Boolean(busy)} onClick={() => void update(row.id, "resolved")} className="rounded-xl bg-[#174db4] px-4 py-2 font-bold text-white">Registrar respuesta</button>
                  <button disabled={Boolean(busy)} onClick={() => void update(row.id, "not_procedent")} className="rounded-xl border border-red-600 px-4 py-2 font-bold text-red-700">No procedente</button>
                </div>
              </div>
            )}
          </article>
        ))}
        {rows.length === 0 && <p className="rounded-2xl bg-white p-6 text-slate-700">No hay solicitudes registradas.</p>}
      </div>
    </main>
  );
}
