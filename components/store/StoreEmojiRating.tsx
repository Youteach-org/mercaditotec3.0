"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { User } from "firebase/auth";

import type { PublicStoreSummary } from "@/lib/store/publicMarketplace";
import { ratingBadgeCandidates, ratingBadgeOverlapArea } from "./ratingBadgePlacement";
import {
  compactStoreRating,
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

function initialRating(store: PublicStoreSummary): RatingView {
  return {
    ratingAverage: store.ratingAverage ?? null,
    ratingCount: store.ratingCount ?? 0,
    ratingDistribution: store.ratingDistribution ?? [0, 0, 0, 0, 0],
    ownRating: null,
    canRate: true,
  };
}

export function StoreRatingBadge({ store }: { store: PublicStoreSummary }) {
  const display = (store.ratingCount ?? 0) > 0 ? compactStoreRating(store.ratingAverage) : null;
  return (
    <span className="mkt-store-rating-summary" aria-label={display
      ? `Calificación ${display.score}`
      : "Esta tienda aún no tiene valoraciones"}>
      {display ? <><span aria-hidden="true">{display.emoji}</span> {display.score}</> : "Sin valoraciones"}
    </span>
  );
}

/**
 * Only real shops shown to logged-in visitors render this compact control.
 * No per-card Firestore requests: own-rating data is fetched only on demand.
 * The picker is portaled outside the card link, so clicking an emoji cannot
 * navigate to the store or interfere with the existing photo gestures.
 */
export function StoreEmojiRatingCard({ user, store }: { user: User; store: PublicStoreSummary }) {
  const [rating, setRating] = useState<RatingView>(() => initialRating(store));
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [position, setPosition] = useState({ left: 12, top: 12 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const endpoint = `/api/marketplace/store-ratings/${encodeURIComponent(store.id)}`;

  /* Each cloud has a different title length, paper size and logo position.
     Find a free spot in the cloud instead of covering handwritten names or
     descriptions with a fixed percentage position. Remeasure on rotation. */
  useEffect(() => {
    const button = triggerRef.current;
    const slot = button?.closest<HTMLElement>(".mkt-store-slot");
    const photo = slot?.querySelector<HTMLElement>(".mkt-store-photo");
    if (!button || !slot || !photo) return;

    const protectedElements = Array.from(slot.querySelectorAll<HTMLElement>(
      ".mkt-store-ribbon, .mkt-store-copy, .mkt-store-logo, .mkt-hand-note",
    ));
    let frame = 0;
    let disposed = false;
    const placeBadge = () => {
      const candidates = ratingBadgeCandidates({
        left: photo.offsetLeft,
        top: photo.offsetTop,
        width: photo.offsetWidth,
        height: photo.offsetHeight,
      }, { width: button.offsetWidth, height: button.offsetHeight });
      if (!candidates.length) {
        button.dataset.positioned = "true";
        return;
      }

      const obstacles = protectedElements
        .filter((element) => element.getClientRects().length > 0)
        .map((element) => ({
          rect: element.getBoundingClientRect(),
          priority: element.matches(".mkt-store-copy, .mkt-store-ribbon") ? 3 : 2,
        }));
      let best = candidates[0];
      let leastOverlap = Infinity;
      for (const candidate of candidates) {
        button.style.setProperty("--mkt-rating-x", `${candidate.left}px`);
        button.style.setProperty("--mkt-rating-y", `${candidate.top}px`);
        const bounds = button.getBoundingClientRect();
        const overlap = obstacles.reduce((total, obstacle) =>
          total + ratingBadgeOverlapArea(bounds, obstacle.rect) * obstacle.priority, 0);
        if (overlap < leastOverlap) {
          leastOverlap = overlap;
          best = candidate;
        }
        if (overlap === 0) break;
      }
      button.style.setProperty("--mkt-rating-x", `${best.left}px`);
      button.style.setProperty("--mkt-rating-y", `${best.top}px`);
      button.dataset.positioned = "true";
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(placeBadge);
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    observer?.observe(slot);
    observer?.observe(photo);
    observer?.observe(button);
    protectedElements.forEach((element) => observer?.observe(element));
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    void document.fonts?.ready.then(() => { if (!disposed) schedule(); });
    schedule();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
    };
  }, [store.id, rating.ratingAverage, rating.ratingCount]);

  useEffect(() => {
    if (!open) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onScroll = () => setOpen(false);
    window.addEventListener("keydown", onEscape);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("keydown", onEscape);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  async function openPicker() {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition({
        left: Math.max(12, Math.min(rect.left, window.innerWidth - 312)),
        top: rect.bottom + 142 > window.innerHeight && rect.top > 150
          ? rect.top - 144 : rect.bottom + 8,
      });
    }
    setOpen(true);
    setError("");
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(endpoint, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo consultar tu valoración.");
      setRating(data.rating as RatingView);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo consultar tu valoración.");
    } finally {
      setLoading(false);
    }
  }

  async function choose(value: StoreRatingValue) {
    if (saving || loading || !rating.canRate) return;
    setSaving(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch(endpoint, {
        method: "POST",
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar la valoración.");
      setRating(data.rating as RatingView);
      setOpen(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo guardar la valoración.");
    } finally {
      setSaving(false);
    }
  }

  const display = rating.ratingCount > 0 ? compactStoreRating(rating.ratingAverage) : null;
  const label = display ? `${display.emoji} ${display.score}` : "💬 Calificar";
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="mkt-card-emoji-rating"
        aria-label={`${store.name}: ${display ? `calificación ${display.score}. Cambiar o añadir valoración` : "Calificar tienda"}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => void openPicker()}
      >
        {label}
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <>
          <button
            type="button"
            className="mkt-emoji-rating-dismiss"
            aria-label="Cerrar selector de calificación"
            onClick={() => setOpen(false)}
          />
          <section
            className="mkt-emoji-rating-picker"
            style={{ top: position.top, left: position.left }}
            role="dialog"
            aria-label={`Calificar ${store.name}`}
          >
            <div className="mkt-emoji-rating-picker-head">
              <strong>¿Qué te pareció?</strong>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar">×</button>
            </div>
            {loading ? (
              <p className="mkt-emoji-rating-status">Cargando…</p>
            ) : !rating.canRate ? (
              <p className="mkt-emoji-rating-status">No puedes valorar tu propia tienda.</p>
            ) : (
              <div className="mkt-emoji-rating-options">
                {STORE_RATING_CHOICES.map((choice) => (
                  <button
                    key={choice.value}
                    type="button"
                    title={choice.label}
                    aria-label={`${choice.value} de 5: ${choice.label}`}
                    aria-pressed={rating.ownRating === choice.value}
                    disabled={saving}
                    onClick={() => void choose(choice.value)}
                    className={rating.ownRating === choice.value ? "is-selected" : ""}
                  >
                    <span aria-hidden="true">{choice.emoji}</span>
                    <small>{choice.value}</small>
                  </button>
                ))}
              </div>
            )}
            {error && <p className="mkt-emoji-rating-error" role="alert">{error}</p>}
          </section>
        </>,
        document.body,
      )}
    </>
  );
}
