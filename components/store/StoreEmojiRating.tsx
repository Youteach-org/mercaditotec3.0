"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import type { PublicStoreSummary } from "@/lib/store/publicMarketplace";
import {
  dominantStoreRating,
  STORE_RATING_CHOICES,
  type StoreRatingValue,
} from "@/lib/store/storeRating";

interface RatingView {
  ratingAverage: number | null;
  ratingCount: number;
  ratingDistribution: number[];
  ownRating: StoreRatingValue | null;
  canRate: boolean;
}

export function StoreRatingBadge({ store }: { store: PublicStoreSummary }) {
  const count = store.ratingCount ?? 0;
  if (count === 0) return <span className="mkt-rating">💬 Sin calificaciones</span>;
  const value = dominantStoreRating({
    ratingCount: count,
    ratingDistribution: store.ratingDistribution ?? [0, 0, 0, 0, 0],
  });
  const emoji = STORE_RATING_CHOICES[(value ?? 3) - 1].emoji;
  return (
    <span className="mkt-rating" aria-label={`Valoración ${store.ratingAverage?.toFixed(1) ?? "—"} de 5, ${count} opiniones`}>
      <span aria-hidden="true">{emoji}</span> {store.ratingAverage?.toFixed(1) ?? "—"}/5 ({count})
    </span>
  );
}

export default function StoreEmojiRating({ user, store }: { user: User; store: PublicStoreSummary }) {
  const [rating, setRating] = useState<RatingView>({
    ratingAverage: store.ratingAverage ?? null,
    ratingCount: store.ratingCount ?? 0,
    ratingDistribution: store.ratingDistribution ?? [0, 0, 0, 0, 0],
    ownRating: null,
    canRate: false,
  });
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const endpoint = `/api/marketplace/store-ratings/${encodeURIComponent(store.id)}`;

  useEffect(() => {
    let cancelled = false;
    void user.getIdToken()
      .then((token) => fetch(endpoint, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      }))
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error ?? "No se pudieron cargar las valoraciones.");
        if (!cancelled) setRating(payload.rating as RatingView);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Error al consultar valoraciones.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [endpoint, user]);

  async function sendRating(value: StoreRatingValue) {
    if (saving || !rating.canRate) return;
    setSaving(true);
    setError("");
    setFeedback("");
    try {
      const token = await user.getIdToken();
      const response = await fetch(endpoint, {
        method: "POST",
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "No se pudo guardar tu valoración.");
      setRating(payload.rating as RatingView);
      setFeedback("Tu valoración se guardó correctamente.");
      setIsOpen(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo guardar tu valoración.");
    } finally {
      setSaving(false);
    }
  }

  const dominant = dominantStoreRating(rating);
  const predominant = dominant ? STORE_RATING_CHOICES[dominant - 1].emoji : "🙂";

  return (
    <section className="mt-4 max-w-md rounded-2xl border border-rose-100 bg-rose-50/60 p-4" aria-label="Calificaciones de la tienda">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-3xl" aria-hidden="true">{rating.ratingCount ? predominant : "💬"}</span>
          <div>
            <p className="text-base font-black text-slate-950">
              {rating.ratingCount ? `${rating.ratingAverage?.toFixed(1) ?? "—"}/5` : "Sin valoraciones"}
            </p>
            <p className="text-xs font-semibold text-slate-600">
              {rating.ratingCount} {rating.ratingCount === 1 ? "valoración" : "valoraciones"}
            </p>
          </div>
        </div>
        {!loading && rating.canRate && (
          <button
            type="button"
            onClick={() => { setIsOpen((current) => !current); setFeedback(""); }}
            className="rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
            aria-expanded={isOpen}
          >
            {rating.ownRating ? "Cambiar valoración" : "¿Qué te pareció?"}
          </button>
        )}
      </div>

      {loading && <p className="mt-2 text-xs text-slate-600">Consultando tus valoraciones…</p>}
      {!loading && !rating.canRate && !error && (
        <p className="mt-2 text-xs font-semibold text-slate-600">No puedes calificar tu propia tienda.</p>
      )}
      {rating.ownRating && !isOpen && (
        <p className="mt-2 text-xs font-semibold text-slate-700">
          Tu reacción: {STORE_RATING_CHOICES[rating.ownRating - 1].emoji} {STORE_RATING_CHOICES[rating.ownRating - 1].label}
        </p>
      )}

      {isOpen && rating.canRate && (
        <div className="mt-3 rounded-xl bg-white p-3">
          <p className="mb-3 text-sm font-bold text-slate-900">Elige un emoji del 1 al 5</p>
          <div className="grid grid-cols-5 gap-1.5">
            {STORE_RATING_CHOICES.map((choice) => (
              <button
                key={choice.value}
                type="button"
                disabled={saving}
                onClick={() => void sendRating(choice.value)}
                title={choice.label}
                aria-label={`${choice.value} de 5: ${choice.label}`}
                aria-pressed={rating.ownRating === choice.value}
                className={`flex min-w-0 flex-col items-center gap-1 rounded-xl border px-1 py-2 hover:bg-rose-50 disabled:opacity-50 ${rating.ownRating === choice.value ? "border-rose-500 bg-rose-50" : "border-slate-200"}`}
              >
                <span className="text-3xl" aria-hidden="true">{choice.emoji}</span>
                <span className="text-xs font-black text-slate-700">{choice.value}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-600">😡 Mala · 😕 Mejorable · 🙂 Bien · 😊 Muy buena · 😍 Excelente</p>
        </div>
      )}

      {rating.ratingCount > 0 && (
        <div className="mt-3 space-y-1.5" aria-label="Distribución de valoraciones">
          {[...STORE_RATING_CHOICES].reverse().map((choice) => {
            const count = rating.ratingDistribution[choice.value - 1] ?? 0;
            return (
              <div key={choice.value} className="flex items-center gap-2 text-xs text-slate-700">
                <span className="w-6 text-center text-lg" aria-label={choice.label}>{choice.emoji}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-rose-500" style={{ width: `${(count / rating.ratingCount) * 100}%` }} />
                </div>
                <span className="w-7 text-right font-bold">{count}</span>
              </div>
            );
          })}
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-xs font-bold text-red-700">{error}</p>}
      {feedback && <p role="status" className="mt-3 text-xs font-bold text-emerald-700">{feedback}</p>}
    </section>
  );
}
