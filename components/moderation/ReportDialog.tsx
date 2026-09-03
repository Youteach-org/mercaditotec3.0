"use client";

import { useState } from "react";
import type { User } from "firebase/auth";

import {
  buildReportPayload,
  moderationApiFetch,
  reportReasonOptions,
  reportTargetLabel,
} from "@/lib/moderation/client";
import type { ReportTargetType } from "@/lib/moderation/domain";

interface Props {
  user: User;
  targetType: ReportTargetType;
  targetId: string;
  onClose: () => void;
  onReported?: () => void;
}

export default function ReportDialog({
  user,
  targetType,
  targetId,
  onClose,
  onReported,
}: Props) {
  const [reasonCode, setReasonCode] = useState("");
  const [details, setDetails] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const response = await moderationApiFetch(user, "/api/reports", {
        method: "POST",
        body: JSON.stringify(buildReportPayload({
          targetType,
          targetId,
          reasonCode,
          details,
        })),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo enviar el reporte.");
      onReported?.();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo enviar el reporte.");
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 p-4" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        className="w-full max-w-md rounded-2xl bg-white p-5 text-slate-900 shadow-2xl"
      >
        <h2 id="report-title" className="text-xl font-black">Reportar {reportTargetLabel(targetType).toLowerCase()}</h2>
        <p className="mt-2 text-sm text-slate-600">
          El reporte será revisado por administración. No bloquea ni sanciona automáticamente a nadie.
        </p>

        {!confirming ? (
          <div className="mt-5 space-y-4">
            <label className="block text-sm font-bold">
              Motivo
              <select
                value={reasonCode}
                onChange={(event) => setReasonCode(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"
              >
                <option value="">Selecciona un motivo</option>
                {reportReasonOptions[targetType].map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-bold">
              Explicación opcional
              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                maxLength={500}
                rows={4}
                className="mt-1 w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5"
              />
              <span className="mt-1 block text-right text-xs font-normal text-slate-500">{details.length}/500</span>
            </label>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <p className="font-bold text-amber-950">¿Confirmas que deseas enviar este reporte?</p>
            <p className="mt-1 text-sm text-amber-900">
              Motivo: {reportReasonOptions[targetType].find((option) => option.value === reasonCode)?.label}
            </p>
          </div>
        )}

        {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-xl border border-slate-300 px-4 py-2 font-bold">
            Cancelar
          </button>
          {confirming ? (
            <button type="button" onClick={() => void submit()} disabled={submitting} className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white disabled:opacity-60">
              {submitting ? "Enviando..." : "Confirmar reporte"}
            </button>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} disabled={!reasonCode} className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white disabled:opacity-50">
              Continuar
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
