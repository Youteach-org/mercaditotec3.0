"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import AdminResolutionPanel from "@/components/moderation/AdminResolutionPanel";
import {
  moderationApiFetch,
  reportTargetLabel,
  type ReportDetailApi,
} from "@/lib/moderation/client";
import { isAdminRole } from "@/lib/security/domain";
import { useSession } from "@/lib/useSession";

export default function AdminReportDetailPage() {
  const params = useParams<{ reportId: string }>();
  const reportId = String(params.reportId ?? "");
  const router = useRouter();
  const { firebaseUser, appUser, loading } = useSession();
  const admin = isAdminRole(appUser);
  const [report, setReport] = useState<ReportDetailApi | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace("/login");
      return;
    }
    if (!admin) {
      router.replace("/marketplace");
      return;
    }
    let cancelled = false;
    void moderationApiFetch(firebaseUser, `/api/admin/reports/${reportId}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "No se pudo abrir el reporte.");
        if (!cancelled) setReport(data.report as ReportDetailApi);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "No se pudo abrir el reporte.");
      });
    return () => { cancelled = true; };
  }, [admin, firebaseUser, loading, reportId, router]);

  if (loading || !firebaseUser || !admin) {
    return <main className="min-h-screen bg-slate-100 p-5">Verificando permisos...</main>;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-2xl bg-slate-950 p-6 text-white shadow-lg">
          <Link href="/admin/reports" className="text-sm font-bold text-sky-300 hover:underline">← Cola de reportes</Link>
          <h1 className="mt-3 text-3xl font-black">Detalle del reporte</h1>
          <p className="mt-1 break-all text-sm text-slate-300">#{reportId}</p>
        </header>
        {error && <p className="rounded-xl bg-red-50 p-4 font-semibold text-red-700">{error}</p>}
        {!report && !error ? <div className="rounded-2xl bg-white p-5 shadow-sm">Cargando...</div> : null}
        {report && (
          <>
            <section className="grid gap-4 sm:grid-cols-2">
              <article className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{reportTargetLabel(report.targetType)}</p>
                <h2 className="mt-2 text-xl font-black text-slate-950">{report.targetSnapshot.identity}</h2>
                <p className="mt-3 text-sm text-slate-700"><strong>Motivo:</strong> {report.reasonCode}</p>
                <p className="mt-2 text-sm text-slate-700">{report.details || "Sin explicación adicional."}</p>
              </article>
              <article className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Persona que reportó</p>
                <h2 className="mt-2 text-lg font-black text-slate-950">{report.reporter?.nickname || report.reporter?.displayName || "Usuario no disponible"}</h2>
                <p className="mt-1 break-all text-sm text-slate-600">{report.reporter?.email}</p>
                <p className="mt-3 text-xs text-slate-500">Solo administración puede ver esta identidad.</p>
              </article>
            </section>

            {report.targetType === "message" && (
              <section className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">Contexto de la sala general</h2>
                <p className="mt-1 text-sm text-slate-600">Máximo cinco mensajes anteriores y cinco posteriores.</p>
                <div className="mt-4 space-y-2">
                  {report.chatContext.map((message) => (
                    <div key={message.id} className={message.id === report.targetId ? "rounded-xl border-2 border-red-400 bg-red-50 p-3" : "rounded-xl border border-slate-200 bg-slate-50 p-3"}>
                      <div className="flex justify-between gap-3 text-xs text-slate-500">
                        <strong>{message.senderName}</strong>
                        <span>{new Date(message.createdAt).toLocaleString("es-MX")}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-800">{message.hidden ? "Mensaje retirado por moderación." : message.text || "[Imagen]"}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <AdminResolutionPanel user={firebaseUser} report={report} onResolved={setReport} />

            <section className="grid gap-4 sm:grid-cols-2">
              <article className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="font-black text-slate-950">Reportes anteriores del objetivo</h2>
                <p className="mt-2 text-sm text-slate-600">{report.previousReports.length} registro(s)</p>
              </article>
              <article className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="font-black text-slate-950">Eventos de auditoría relacionados</h2>
                <p className="mt-2 text-sm text-slate-600">{report.auditEvents.length} registro(s)</p>
              </article>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
