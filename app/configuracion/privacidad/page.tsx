"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";
import { storeApiFetch } from "@/lib/store/client";
import { arcoLabels, arcoStatusLabels, type ArcoType, type ArcoStatus } from "@/lib/privacy/arco";

type RequestRow = {
  id: string; type: ArcoType; status: ArcoStatus;
  details: string; response: string; createdAt: string;
};
type DataView = {
  account: { email: string; nickname: string; whatsappNumber: string; photoURL: string };
  requests: RequestRow[];
};

const options: Array<{ type: ArcoType; summary: string; icon: string }> = [
  { type: "access", icon: "A", summary: "Solicita conocer qué datos personales tenemos y cómo los utilizamos." },
  { type: "rectification", icon: "R", summary: "Indica qué dato personal es incorrecto y cuál debe reemplazarlo." },
  { type: "cancellation", icon: "C", summary: "Solicita cancelar tu cuenta o tus datos cuando legalmente corresponda." },
  { type: "opposition", icon: "O", summary: "Indica para qué finalidad solicitas que dejemos de usar tus datos." },
];

export default function PrivacidadYDatosPage() {
  const router = useRouter();
  const { firebaseUser, loading: sessionLoading } = useSession();
  const [data, setData] = useState<DataView | null>(null);
  const [type, setType] = useState<ArcoType>("access");
  const [details, setDetails] = useState("");
  const [confirmCancellation, setConfirmCancellation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const refresh = useCallback(async () => {
    if (!firebaseUser) return;
    setRefreshing(true);
    try {
      const response = await storeApiFetch(firebaseUser, "/api/privacy/requests", { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "No pudimos recuperar tus solicitudes.");
      setData(body as DataView);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos recuperar tus solicitudes.");
    } finally {
      setRefreshing(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!firebaseUser) { router.replace("/login"); return; }
    void refresh();
  }, [firebaseUser, router, refresh, sessionLoading]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!firebaseUser || busy) return;
    if (type === "cancellation" && !confirmCancellation) {
      setError("Confirma que comprendes que la solicitud no elimina automáticamente la cuenta.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await storeApiFetch(firebaseUser, "/api/privacy/requests", {
        method: "POST",
        body: JSON.stringify({ type, details }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "No se pudo registrar tu solicitud.");
      setSuccess("Solicitud registrada con folio. Puedes consultar su estado y la respuesta aquí.");
      setDetails("");
      setConfirmCancellation(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fff9ee] px-4 py-7 text-[#123d82] sm:px-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <Link href="/configuracion" className="font-bold text-[#174db4]">← Volver a Configuración</Link>
        <header className="rounded-3xl bg-[#123d82] p-6 text-white">
          <p className="text-sm font-bold text-[#ffd54c]">MercaditoTec · Privacidad</p>
          <h1 className="mt-2 text-3xl font-black">Tus datos y derechos ARCO</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/90">Acceso, Rectificación, Cancelación y Oposición. Solicita una revisión sin perder el acceso a tus datos actuales.</p>
        </header>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">Datos básicos de tu cuenta</h2>
          <p className="mt-1 text-sm text-slate-700">Este es un resumen, no una exportación completa de tus datos.</p>
          {refreshing && !data ? (
            <p className="mt-3 text-sm" role="status">Consultando información…</p>
          ) : (
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="font-bold">Correo institucional</dt><dd className="mt-1 break-all text-slate-700">{data?.account.email || "Sin datos"}</dd></div>
              <div><dt className="font-bold">Nombre de usuario</dt><dd className="mt-1 break-all text-slate-700">{data?.account.nickname || "Sin datos"}</dd></div>
              <div><dt className="font-bold">WhatsApp de perfil</dt><dd className="mt-1 text-slate-700">{data?.account.whatsappNumber || "No proporcionado"}</dd></div>
              <div><dt className="font-bold">Fotografía de perfil</dt><dd className="mt-1 text-slate-700">{data?.account.photoURL ? "Registrada" : "No registrada"}</dd></div>
            </dl>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/profile" className="rounded-xl bg-[#ffd54c] px-4 py-2.5 font-bold">Corregir mis datos de perfil →</Link>
            <Link href="/terms" className="rounded-xl border border-[#174db4] px-4 py-2.5 font-bold">Ver reglas de uso →</Link>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm" aria-labelledby="solicitud-arco-title">
          <h2 id="solicitud-arco-title" className="text-xl font-black">Enviar una solicitud ARCO</h2>
          <p className="mt-1 text-sm text-slate-700">Elige un derecho. El responsable revisará la solicitud y su respuesta aparecerá en el historial. No se eliminan datos automáticamente al enviarla.</p>
          <form onSubmit={submit} className="mt-4 space-y-4">
            <fieldset>
              <legend className="mb-3 font-bold">¿Qué deseas solicitar?</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {options.map(option => (
                  <label key={option.type} className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 ${type === option.type ? "border-[#174db4] bg-[#fff3d6]" : "border-[#ead7af]"}`}>
                    <input type="radio" name="arco-type" checked={type === option.type}
                      onChange={() => { setType(option.type); setConfirmCancellation(false); }} className="mt-1 accent-[#174db4]" />
                    <span><span className="font-black">{option.icon} — {arcoLabels[option.type]}</span>
                      <span className="mt-1 block text-sm text-slate-700">{option.summary}</span></span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block font-bold" htmlFor="arco-details">Descripción de tu solicitud</label>
            <textarea id="arco-details" rows={4} maxLength={1200} value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder={type === "rectification" ? "Explica qué dato está equivocado y cuál es el correcto." : type === "opposition" ? "Indica a qué uso de tus datos te opones." : type === "cancellation" ? "¿Deseas cancelar tu cuenta o solo determinados datos?" : "¿Qué información quieres consultar?"}
              className="w-full rounded-xl border-2 border-[#e4cfa8] bg-white p-3 text-slate-900 focus:border-[#174db4]"
              aria-describedby="arco-count" />
            <p id="arco-count" className="text-right text-xs text-slate-600">{details.length}/1200 caracteres</p>
            {type === "cancellation" && (
              <label className="flex items-start gap-3 rounded-xl bg-[#fff0cf] p-4 text-sm">
                <input type="checkbox" checked={confirmCancellation} onChange={e => setConfirmCancellation(e.target.checked)} className="mt-1" />
                <span>Entiendo que enviar esta solicitud <strong>no elimina inmediatamente la cuenta</strong>. El responsable debe verificar mi identidad, revisar qué datos pueden suprimirse y tramitar la respuesta.</span>
              </label>
            )}
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 font-bold text-red-700">{error}</p>}
            {success && <p role="status" className="rounded-xl bg-green-50 p-3 font-bold text-green-800">{success}</p>}
            <button type="submit" disabled={busy || sessionLoading}
              className="w-full rounded-xl bg-[#174db4] p-3 font-black text-white disabled:opacity-60">
              {busy ? "Enviando…" : "Registrar solicitud con folio"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm" aria-labelledby="arco-history">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="arco-history" className="text-xl font-black">Mis solicitudes</h2>
            <button type="button" onClick={() => void refresh()} disabled={refreshing}
              className="rounded-xl border border-[#174db4] px-3 py-2 text-sm font-bold">{refreshing ? "Actualizando…" : "Actualizar"}</button>
          </div>
          {data && data.requests.length === 0 && <p className="mt-3 text-sm text-slate-700">Todavía no has registrado solicitudes.</p>}
          <div className="mt-4 space-y-3">
            {data?.requests.map(request => (
              <article key={request.id} className="rounded-xl border border-[#ead7af] p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <h3 className="font-black">{arcoLabels[request.type]}</h3>
                  <span className="rounded-lg bg-[#fff0cf] px-2 py-1 text-sm font-bold">{arcoStatusLabels[request.status]}</span>
                </div>
                <p className="mt-2 text-xs text-slate-600">Recibida: {new Date(request.createdAt).toLocaleString("es-MX")} · Folio: {request.id.slice(-28)}</p>
                {request.details && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">{request.details}</p>}
                {request.response && <p className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-[#fff9ee] p-3 text-sm"><strong>Respuesta del responsable:</strong><br />{request.response}</p>}
              </article>
            ))}
          </div>
        </section>

        <aside className="rounded-2xl border-2 border-amber-300 bg-[#fff3d6] p-4 text-sm leading-relaxed text-slate-800">
          <strong>Aviso de privacidad integral:</strong> su publicación definitiva está pendiente de verificar la identidad y el canal de contacto del responsable. Las reglas de uso están disponibles, pero no las presentamos como sustituto del aviso legal. Las solicitudes ARCO se reciben desde esta pantalla y requieren revisión humana.
        </aside>
      </div>
    </main>
  );
}
