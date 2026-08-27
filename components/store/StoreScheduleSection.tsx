"use client";

import type { User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";

import StoreScheduleGrid from "@/components/store/StoreScheduleGrid";
import { storeApiFetch, type StoreApiRecord } from "@/lib/store/client";
import {
  toggleScheduleHour,
  type StoreHour,
  type StoreOperationalMode,
  type StoreSchedule,
  type StoreWeekDay,
} from "@/lib/store/schedule";

interface Props {
  user: User;
  store: StoreApiRecord;
  editable: boolean;
  onStoreChanged: (store: StoreApiRecord) => void;
  onScheduleChanged?: (schedule: StoreSchedule) => void;
}

export default function StoreScheduleSection({
  user,
  store,
  editable,
  onStoreChanged,
  onScheduleChanged,
}: Props) {
  const [schedule, setSchedule] = useState<StoreSchedule>(store.schedule);
  const [operationalMode, setOperationalMode] = useState<StoreOperationalMode>(store.operationalMode);
  const [manualOpen, setManualOpen] = useState<boolean>(store.manualOpen ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSchedule(store.schedule);
    setOperationalMode(store.operationalMode);
    setManualOpen(store.manualOpen ?? true);
    onScheduleChanged?.(store.schedule);
  }, [store.schedule, store.operationalMode, store.manualOpen, onScheduleChanged]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  async function persistSchedule(nextSchedule: StoreSchedule) {
    if (!editable) return;
    setSaving(true);
    setError("");

    try {
      const response = await storeApiFetch(user, `/api/stores/${store.id}/schedule`, {
        method: "PATCH",
        body: JSON.stringify({
          schedule: nextSchedule,
          operationalMode: store.status === "active" ? operationalMode : "automatic",
          manualOpen: store.status === "active" && operationalMode === "manual" ? manualOpen : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar el horario.");
      onStoreChanged(data.store as StoreApiRecord);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el horario.");
    } finally {
      setSaving(false);
    }
  }

  function toggleHour(day: StoreWeekDay, hour: StoreHour) {
    if (!editable) return;

    const next = toggleScheduleHour(schedule, day, hour);
    setSchedule(next);
    onScheduleChanged?.(next);

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persistSchedule(next), 450);
  }

  async function setOperational(mode: StoreOperationalMode, open: boolean | null) {
    if (!editable || store.status !== "active") return;
    setOperationalMode(mode);
    if (typeof open === "boolean") setManualOpen(open);
    setSaving(true);
    setError("");

    try {
      const response = await storeApiFetch(user, `/api/stores/${store.id}/schedule`, {
        method: "PATCH",
        body: JSON.stringify({
          schedule,
          operationalMode: mode,
          manualOpen: mode === "manual" ? open : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo cambiar el estado de la tienda.");
      onStoreChanged(data.store as StoreApiRecord);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo cambiar el estado de la tienda.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Horario</h2>
          <p className="mt-1 text-sm text-gray-600">
            Toca o haz clic en las horas en las que puedes atender. Los cuadros azules quedan disponibles.
          </p>
        </div>
        {saving && <span className="text-xs font-semibold text-gray-400">Guardando…</span>}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-medium text-gray-600">
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 rounded border border-blue-700 bg-blue-600" />
          Disponible
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 rounded border border-gray-200 bg-white" />
          No disponible
        </span>
        <span className="text-gray-500">7 a. m. a 9 p. m.</span>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-1.5 sm:p-2 md:p-3">
        <StoreScheduleGrid schedule={schedule} editable={editable} onToggle={toggleHour} />
      </div>

      {store.status === "active" && (
        <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="font-semibold text-gray-900">Cambios temporales</div>
          <p className="mt-1 text-xs text-gray-500">
            Úsalos únicamente cuando necesites apartarte temporalmente del horario normal.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!editable || saving}
              onClick={() => void setOperational("manual", false)}
              className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700"
            >
              Pausar temporalmente
            </button>
            <button
              type="button"
              disabled={!editable || saving}
              onClick={() => void setOperational("manual", true)}
              className="rounded-xl border border-green-200 bg-white px-4 py-2.5 text-sm font-semibold text-green-700"
            >
              Abrir temporalmente
            </button>
            {operationalMode === "manual" && (
              <button
                type="button"
                disabled={!editable || saving}
                onClick={() => void setOperational("automatic", null)}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Volver al horario automáticamente
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
