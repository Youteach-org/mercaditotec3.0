"use client";

import type { User } from "firebase/auth";
import { useEffect, useState } from "react";

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
}

export default function StoreScheduleSection({
  user,
  store,
  editable,
  onStoreChanged,
}: Props) {
  const [schedule, setSchedule] = useState<StoreSchedule>(store.schedule);
  const [operationalMode, setOperationalMode] = useState<StoreOperationalMode>(
    store.operationalMode,
  );
  const [manualOpen, setManualOpen] = useState<boolean>(store.manualOpen ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setSchedule(store.schedule);
    setOperationalMode(store.operationalMode);
    setManualOpen(store.manualOpen ?? true);
  }, [store.schedule, store.operationalMode, store.manualOpen]);

  function toggleHour(day: StoreWeekDay, hour: StoreHour) {
    if (!editable) return;
    setSchedule((current) => toggleScheduleHour(current, day, hour));
    setMessage("");
  }

  async function save() {
    if (!editable) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await storeApiFetch(user, `/api/stores/${store.id}/schedule`, {
        method: "PATCH",
        body: JSON.stringify({
          schedule,
          operationalMode,
          manualOpen: operationalMode === "manual" ? manualOpen : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo guardar el horario.");
      }

      onStoreChanged(data.store as StoreApiRecord);
      setMessage("Horario guardado.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "No se pudo guardar el horario.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-md sm:p-6">
      <h2 className="text-xl font-bold text-gray-900">Horario</h2>
      <p className="mt-1 text-sm text-gray-600">
        Toca o haz clic directamente sobre cada hora en la que la tienda puede atender.
        Los cuadros azules son horas abiertas. Cada cuadro representa una hora completa.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-medium text-gray-600">
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 rounded border border-blue-700 bg-blue-600" />
          Abierto
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 rounded border border-gray-200 bg-white" />
          Cerrado
        </span>
        <span className="text-gray-500">Horario disponible: 7 a. m. a 9 p. m.</span>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {message}
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-2 sm:p-4">
        <StoreScheduleGrid
          schedule={schedule}
          editable={editable}
          onToggle={toggleHour}
        />
      </div>

      <div className="mt-6 rounded-xl bg-gray-50 p-4">
        <div className="font-semibold text-gray-900">Estado operativo</div>
        <p className="mt-1 text-xs text-gray-500">
          El horario azul se usa automáticamente, salvo que pauses o actives manualmente la tienda.
        </p>

        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!editable}
            onClick={() => setOperationalMode("automatic")}
            className={
              operationalMode === "automatic"
                ? "rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white"
                : "rounded-xl border border-gray-300 bg-white px-4 py-2.5 font-semibold text-gray-700"
            }
          >
            Volver al horario automáticamente
          </button>

          <button
            type="button"
            disabled={!editable}
            onClick={() => {
              setOperationalMode("manual");
              setManualOpen(false);
            }}
            className={
              operationalMode === "manual" && !manualOpen
                ? "rounded-xl bg-red-600 px-4 py-2.5 font-semibold text-white"
                : "rounded-xl border border-red-200 bg-white px-4 py-2.5 font-semibold text-red-700"
            }
          >
            Pausar tienda
          </button>

          <button
            type="button"
            disabled={!editable}
            onClick={() => {
              setOperationalMode("manual");
              setManualOpen(true);
            }}
            className={
              operationalMode === "manual" && manualOpen
                ? "rounded-xl bg-green-600 px-4 py-2.5 font-semibold text-white"
                : "rounded-xl border border-green-200 bg-white px-4 py-2.5 font-semibold text-green-700"
            }
          >
            Activar manualmente
          </button>
        </div>
      </div>

      {editable && (
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="mt-5 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:bg-slate-500"
        >
          {saving ? "Guardando..." : "Guardar horario"}
        </button>
      )}
    </section>
  );
}
