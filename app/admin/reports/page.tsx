"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  moderationApiFetch,
  reportStatusOptions,
  reportTargetLabel,
  type ReportApiRecord,
} from "@/lib/moderation/client";
import type { ReportStatus, ReportTargetType } from "@/lib/moderation/domain";
import { isAdminRole } from "@/lib/security/domain";
import { useSession } from "@/lib/useSession";

const statusClasses: Record<ReportStatus, string> = {
  open: "bg-red-100 text-red-800",
  in_review: "bg-amber-100 text-amber-800",
  resolved: "bg-emerald-100 text-emerald-800",
  dismissed: "bg-slate-200 text-slate-700",
};
const emptyCounts: Record<ReportStatus, number> = {
  open: 0,
  in_review: 0,
  resolved: 0,
  dismissed: 0,
};

export default function AdminReportsPage() {
  const router = useRouter();
  const { firebaseUser, appUser, loading } = useSession();
  const admin = isAdminRole(appUser);
  const [reports, setReports] = useState<ReportApiRecord[]>([]);
  const [counts, setCounts] = useState<Record<ReportStatus, number>>(emptyCounts);
  const [status, setStatus] = useState<ReportStatus | "">("open");
  const [targetType, setTargetType] = useState<ReportTargetType | "">("");
  const [reason, setReason] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) router.replace("/login");
    else if (!admin) router.replace("/marketplace");
  }, [admin, firebaseUser, loading, router]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (targetType) params.set("targetType", targetType);
    if (reason.trim()) params.set("reason", reason.trim());
    if (search.trim()) params.set("search", search.trim());
    if (from) params.set("from", new Date(`${from}T00:00:00`).toISOString());
    if (to) params.set("to", new Date(`${to}T23:59:59`).toISOString());
    return params.toString();
  }, [from, reason, search, status, targetType, to]);

  useEffect(() => {
    if (!firebaseUser || !admin) return;
    let cancelled = false;
    setTimeout(() => {
      if (!cancelled) {
        setBusy(true);
        setError("");
      }
    }, 0);
    void moderationApiFetch(firebaseUser, `/api/admin/reports?${queryString}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar los reportes.");
        if (!cancelled) {
          setReports(data.reports ?? []);
          setCounts(data.counts ?? emptyCounts);
        }
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los reportes.");
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => { cancelled = true; };
  }, [admin, firebaseUser, queryString]);

  if (loading || !firebaseUser || !admin) {
    return <main className="min-h-screen bg-slate-100 p-5">Verificando permisos...</main>;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="rounded-2xl bg-slate-950 p-6 text-white shadow-lg">
          <Link href="/admin" className="text-sm font-bold text-sky-300 hover:underline">← Centro de administración</Link>
          <h1 className="mt-3 text-3xl font-black">Reportes</h1>
          <p className="mt-2 text-slate-300">Revisión humana de usuarios, tiendas y mensajes. Un reporte nunca sanciona automáticamente.</p>
        </header>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {reportStatusOptions.map((option) => (
            <button key={option.value} type="button" onClick={() => setStatus(option.value)} className="rounded-2xl bg-white p-4 text-left shadow-sm">
              <span className="text-2xl font-black text-slate-950">{counts[option.value]}</span>
              <span className="block text-sm font-semibold text-slate-600">{option.label}</span>
            </button>
          ))}
        </section>

        <section className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-6">
          <select value={status} onChange={(event) => setStatus(event.target.value as ReportStatus | "")} className="rounded-xl border border-slate-300 px-3 py-2">
            <option value="">Todos los estados</option>
            {reportStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select value={targetType} onChange={(event) => setTargetType(event.target.value as ReportTargetType | "")} className="rounded-xl border border-slate-300 px-3 py-2">
            <option value="">Todos los tipos</option>
            <option value="user">Usuarios</option>
            <option value="store">Tiendas</option>
            <option value="message">Mensajes</option>
          </select>
          <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Código de motivo" className="rounded-xl border border-slate-300 px-3 py-2" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ID o identidad" className="rounded-xl border border-slate-300 px-3 py-2" />
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2" aria-label="Desde" />
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2" aria-label="Hasta" />
        </section>

        {error && <p className="rounded-xl bg-red-50 p-4 font-semibold text-red-700">{error}</p>}
        <section className="space-y-3">
          {busy ? (
            <div className="rounded-2xl bg-white p-5 shadow-sm">Cargando reportes...</div>
          ) : reports.length === 0 ? (
            <div className="rounded-2xl bg-white p-5 text-slate-600 shadow-sm">No hay reportes con estos filtros.</div>
          ) : reports.map((report) => (
            <Link key={report.id} href={`/admin/reports/${report.id}`} className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{reportTargetLabel(report.targetType)} · {report.reasonCode}</p>
                  <h2 className="mt-1 text-lg font-black text-slate-950">{report.targetSnapshot.identity}</h2>
                  <p className="mt-1 text-sm text-slate-600">#{report.id} · {new Date(report.createdAt).toLocaleString("es-MX")}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses[report.status]}`}>{reportStatusOptions.find((item) => item.value === report.status)?.label}</span>
              </div>
              <p className="mt-3 text-sm text-slate-700">{report.details || "Sin explicación adicional."}</p>
              <p className="mt-2 text-xs font-semibold text-slate-500">{report.assignedAdminUid ? `En revisión por ${report.assignedAdminUid}` : "Sin asignar"}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
