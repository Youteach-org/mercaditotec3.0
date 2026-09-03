"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  moderationApiFetch,
  type GeneralChatMessageApi,
  type ReportApiRecord,
} from "@/lib/moderation/client";
import { isAdminRole } from "@/lib/security/domain";
import { useSession } from "@/lib/useSession";

interface ReportedChatItem {
  report: ReportApiRecord;
  context: GeneralChatMessageApi[];
}

export default function AdminReportedChatPage() {
  const router = useRouter();
  const { firebaseUser, appUser, loading } = useSession();
  const admin = isAdminRole(appUser);
  const [items, setItems] = useState<ReportedChatItem[]>([]);
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
    void moderationApiFetch(firebaseUser, "/api/admin/chat/reported")
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "No se pudo cargar la moderación del chat.");
        if (!cancelled) setItems(data.items ?? []);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la moderación del chat.");
      });
    return () => { cancelled = true; };
  }, [admin, firebaseUser, loading, router]);

  if (loading || !firebaseUser || !admin) {
    return <main className="min-h-screen bg-slate-100 p-5">Verificando permisos...</main>;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-2xl bg-slate-950 p-6 text-white shadow-lg">
          <Link href="/admin" className="text-sm font-bold text-sky-300 hover:underline">← Centro de administración</Link>
          <h1 className="mt-3 text-3xl font-black">Moderación del chat general</h1>
          <p className="mt-2 text-slate-300">Solo aparecen mensajes reportados y su contexto inmediato. Esta página no permite navegar libremente por la sala.</p>
        </header>
        {error && <p className="rounded-xl bg-red-50 p-4 font-semibold text-red-700">{error}</p>}
        {!error && items.length === 0 && <div className="rounded-2xl bg-white p-5 text-slate-600 shadow-sm">No hay mensajes pendientes de moderación.</div>}
        {items.map(({ report, context }) => (
          <article key={report.id} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-red-700">{report.reasonCode}</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">{report.targetSnapshot.identity}</h2>
                <p className="mt-1 text-sm text-slate-600">{report.details || "Sin explicación adicional."}</p>
              </div>
              <Link href={`/admin/reports/${report.id}`} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">Revisar y actuar</Link>
            </div>
            <div className="mt-4 space-y-2">
              {context.map((message) => (
                <div key={message.id} className={message.id === report.targetId ? "rounded-xl border-2 border-red-400 bg-red-50 p-3" : "rounded-xl border border-slate-200 bg-slate-50 p-3"}>
                  <p className="text-xs font-bold text-slate-600">{message.senderName}</p>
                  <p className="mt-1 text-sm text-slate-800">{message.hidden ? "Mensaje retirado por moderación." : message.text || "[Imagen]"}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
