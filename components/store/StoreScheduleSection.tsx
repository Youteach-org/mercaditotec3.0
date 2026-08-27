"use client";

import type { User } from "firebase/auth";
import { useState } from "react";

import { storeApiFetch, type StoreApiRecord } from "@/lib/store/client";
import {
  STORE_WEEK_DAYS,
  type StoreOperationalMode,
  type StoreSchedule,
  type StoreWeekDay,
} from "@/lib/store/schedule";

const DAY_LABELS: Record<StoreWeekDay, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

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

  function updateDay(day: StoreWeekDay, patch: Partial<StoreSchedule[StoreWeekDay]>) {
    setSchedule((current) => ({
      ...current,
      [day]: {
        ...current[day],
        ...patch,
      },
    }));
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
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar el horario.");
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
    <section className="rounded-2xl bg-white p-6 shadow-md">
      <h2 className="text-xl font-bold text-gray-900">Horario</h2>
      <p className="mt-1 text-sm text-gray-600">
        Define cuándo aparece la tienda como activa. Puedes pausarla manualmente y después volver al horario automático.
      </p>

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

      <div className="mt-5 space-y-3">
        {STORE_WEEK_DAYS.map((day) => {
          const value = schedule[day];
          return (
            <div
              key={day}
              className="grid gap-3 rounded-xl border border-gray-200 p-3 sm:grid-cols-[120px_1fr_1fr] sm:items-center"
            >
              <label className="flex items-center gap-2 font-semibold text-gray-800">
                <input
                  type="checkbox"
                  checked={value.enabled}
                  disabled={!editable}
                  onChange={(event) => updateDay(day, { enabled: event.target.checked })}
                />
                {DAY_LABELS[day]}
              </label>

              <label className="text-sm text-gray-600">
                Abre
                <input
                  type="time"
                  value={value.open}
                  disabled={!editable || !value.enabled}
                  onChange={(event) => updateDay(day, { open: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-100"
                />
              </label>

              <label className="text-sm text-gray-600">
                Cierra
                <input
                  type="time"
                  value={value.close}
                  disabled={!editable || !value.enabled}
                  onChange={(event) => updateDay(day, { close: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-100"
                />
              </label>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl bg-gray-50 p-4">
        <div className="font-semibold text-gray-900">Estado operativo</div>
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
