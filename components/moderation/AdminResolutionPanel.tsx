"use client";

import { useMemo, useState } from "react";
import type { User } from "firebase/auth";

import {
  actionOptionsForTarget,
  moderationApiFetch,
  type ReportDetailApi,
} from "@/lib/moderation/client";
import type { ModerationAction } from "@/lib/moderation/domain";

interface Props {
  user: User;
  report: ReportDetailApi;
  onResolved: (report: ReportDetailApi) => void;
}

export default function AdminResolutionPanel({ user, report, onResolved }: Props) {
  const options = useMemo(
    () => actionOptionsForTarget(report.targetType),
    [report.targetType],
  );
  const [action, setAction] = useState<ModerationAction>("dismiss");
  const [reason, setReason] = useState("");
  const [blockedUntil, setBlockedUntil] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const terminal = report.status === "resolved" || report.status === "dismissed";

  async function resolve() {
    setSubmitting(true);
    setError("");
    try {
      const response = await moderationApiFetch(
        user,
        `/api/admin/reports/${report.id}/resolve`,
        {
          method: "POST",
          body: JSON.stringify({
            action,
            reason,
            blockedUntil: action === "user_block" && blockedUntil
              ? new Date(blockedUntil).toISOString()
              : null,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo resolver el reporte.");
      onResolved(data.report as ReportDetailApi);
      setConfirming(false);
    } catch (resolveError) {
      setError(resolveError instanceof Error ? resolveError.message : "No se pudo resolver el reporte.");
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (terminal) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="text-lg font-black text-emerald-950">Reporte cerrado</h2>
        <p className="mt-2 text-sm text-emerald-900">
          {report.resolutionNote || "La decisión administrativa quedó registrada."}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">Resolver reporte</h2>
      <div className="mt-4 space-y-4">
        <label className="block text-sm font-bold text-slate-800">
          Acción
          <select value={action} onChange={(event) => {
            setAction(event.target.value as ModerationAction);
            setConfirming(false);
          }} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5">
            {options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        {action === "user_block" && (
          <label className="block text-sm font-bold text-slate-800">
            Bloquear hasta
            <input
              type="datetime-local"
              value={blockedUntil}
              onChange={(event) => setBlockedUntil(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"
            />
          </label>
        )}
        <label className="block text-sm font-bold text-slate-800">
          Motivo administrativo
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            rows={4}
            className="mt-1 w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5"
          />
        </label>
        {confirming && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            Confirma la acción. Se aplicará y se registrará en el historial administrativo.
          </div>
        )}
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          {confirming && (
            <button type="button" onClick={() => setConfirming(false)} className="rounded-xl border border-slate-300 px-4 py-2 font-bold">
              Volver
            </button>
          )}
          <button
            type="button"
            onClick={() => confirming ? void resolve() : setConfirming(true)}
            disabled={!reason.trim() || (action === "user_block" && !blockedUntil) || submitting}
            className="rounded-xl bg-slate-950 px-4 py-2 font-bold text-white disabled:opacity-50"
          >
            {submitting ? "Guardando..." : confirming ? "Confirmar acción" : "Continuar"}
          </button>
        </div>
      </div>
    </section>
  );
}
