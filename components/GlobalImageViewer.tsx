"use client";

import { useEffect, useRef, useState } from "react";

type ViewerImage = {
  src: string;
  alt: string;
};

type Point = {
  x: number;
  y: number;
};

const MIN_SCALE = 1;
const MAX_SCALE = 6;

function clampScale(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

export default function GlobalImageViewer() {
  const [image, setImage] = useState<ViewerImage | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });

  const pointersRef = useRef(new Map<number, Point>());
  const dragStartRef = useRef<Point | null>(null);
  const offsetStartRef = useRef<Point>({ x: 0, y: 0 });
  const pinchDistanceRef = useRef<number | null>(null);
  const pinchScaleRef = useRef(1);
  const pendingMarketplaceClickRef = useRef<{
    href: string;
    timer: number;
  } | null>(null);

  function resetTransform() {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    pointersRef.current.clear();
    dragStartRef.current = null;
    pinchDistanceRef.current = null;
  }

  function close() {
    setImage(null);
    resetTransform();
  }

  useEffect(() => {
    function clearPendingMarketplaceClick() {
      const pending = pendingMarketplaceClickRef.current;
      if (!pending) return;
      window.clearTimeout(pending.timer);
      pendingMarketplaceClickRef.current = null;
    }

    function openViewer(src: string, alt: string) {
      setImage({ src, alt });
      resetTransform();
    }

    function handleMarketplaceImageInteraction(
      event: MouseEvent,
      src: string,
      alt: string,
      href: string,
    ) {
      event.preventDefault();
      event.stopPropagation();

      // Let the browser's real dblclick event win. A single click waits long
      // enough that the viewer can never mount between click #1 and click #2.
      if (event.detail >= 2) {
        clearPendingMarketplaceClick();
        window.location.assign(href);
        return;
      }

      clearPendingMarketplaceClick();

      const timer = window.setTimeout(() => {
        pendingMarketplaceClickRef.current = null;
        openViewer(src, alt);
      }, 430);

      pendingMarketplaceClickRef.current = {
        href,
        timer,
      };
    }

    function openMarketplaceStoreFromDoubleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const destinationTarget = target.closest("[data-image-double-href]");
      if (
        !(destinationTarget instanceof HTMLElement) &&
        !(destinationTarget instanceof SVGElement)
      ) {
        return;
      }

      const href =
        destinationTarget.getAttribute("data-image-double-href")?.trim() ?? "";
      if (!href) return;

      event.preventDefault();
      event.stopPropagation();
      clearPendingMarketplaceClick();
      close();
      window.location.assign(href);
    }

    function openFromContentImage(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const explicitTarget = target.closest("[data-image-zoom-src]");
      if (explicitTarget instanceof HTMLElement || explicitTarget instanceof SVGElement) {
        const src = explicitTarget.getAttribute("data-image-zoom-src")?.trim() ?? "";
        if (src) {
          const alt =
            explicitTarget.getAttribute("data-image-zoom-alt")?.trim() ||
            "Imagen ampliada";
          const doubleHref =
            explicitTarget.getAttribute("data-image-double-href")?.trim() ?? "";

          if (doubleHref) {
            handleMarketplaceImageInteraction(
              event,
              src,
              alt,
              doubleHref,
            );
          } else {
            event.preventDefault();
            event.stopPropagation();
            openViewer(src, alt);
          }
          return;
        }
      }

      const img = target.closest("img");
      if (!(img instanceof HTMLImageElement)) return;
      if (img.dataset.noImageZoom === "true") return;

      const interactiveParent = img.closest("button, a, label");
      if (interactiveParent && img.dataset.forceImageZoom !== "true") return;

      const src = img.currentSrc || img.src;
      if (!src) return;

      const doubleHref = img.dataset.imageDoubleHref?.trim() ?? "";
      const alt = img.alt || "Imagen ampliada";

      if (doubleHref) {
        handleMarketplaceImageInteraction(
          event,
          src,
          alt,
          doubleHref,
        );
        return;
      }

      openViewer(src, alt);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    document.addEventListener("click", openFromContentImage);
    document.addEventListener("dblclick", openMarketplaceStoreFromDoubleClick);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      clearPendingMarketplaceClick();
      document.removeEventListener("click", openFromContentImage);
      document.removeEventListener("dblclick", openMarketplaceStoreFromDoubleClick);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!image) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [image]);

  function changeScale(next: number) {
    const clamped = clampScale(next);
    setScale(clamped);
    if (clamped === 1) setOffset({ x: 0, y: 0 });
  }

  function pointerDistance() {
    const points = [...pointersRef.current.values()];
    if (points.length < 2) return null;
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size === 1) {
      dragStartRef.current = { x: event.clientX, y: event.clientY };
      offsetStartRef.current = offset;
    } else if (pointersRef.current.size === 2) {
      pinchDistanceRef.current = pointerDistance();
      pinchScaleRef.current = scale;
      dragStartRef.current = null;
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size >= 2) {
      const distance = pointerDistance();
      if (!distance || !pinchDistanceRef.current) return;
      changeScale(pinchScaleRef.current * (distance / pinchDistanceRef.current));
      return;
    }

    if (scale <= 1 || !dragStartRef.current) return;

    setOffset({
      x: offsetStartRef.current.x + event.clientX - dragStartRef.current.x,
      y: offsetStartRef.current.y + event.clientY - dragStartRef.current.y,
    });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(event.pointerId);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer may already be released by the browser.
    }

    if (pointersRef.current.size < 2) {
      pinchDistanceRef.current = null;
    }

    if (pointersRef.current.size === 1) {
      const remaining = [...pointersRef.current.values()][0];
      dragStartRef.current = remaining;
      offsetStartRef.current = offset;
    } else if (pointersRef.current.size === 0) {
      dragStartRef.current = null;
    }
  }

  if (!image) return null;

  return (
    <div
      className="fixed inset-0 z-[100000] flex flex-col bg-black/92"
      role="dialog"
      aria-modal="true"
      aria-label="Visor de imagen"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 bg-black/70 px-3 py-2 text-white sm:px-5">
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold text-white/80">{image.alt}</div>
          <div className="text-[11px] text-white/60">{Math.round(scale * 100)}%</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeScale(scale - 0.5)}
            disabled={scale <= MIN_SCALE}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-2xl font-bold text-white disabled:opacity-40"
            aria-label="Alejar imagen"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => changeScale(scale + 0.5)}
            disabled={scale >= MAX_SCALE}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-2xl font-bold text-white disabled:opacity-40"
            aria-label="Acercar imagen"
          >
            +
          </button>
          <button
            type="button"
            onClick={resetTransform}
            className="rounded-full bg-white/15 px-3 py-2 text-xs font-bold text-white"
          >
            Ajustar
          </button>
          <button
            type="button"
            onClick={close}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-2xl font-black text-black"
            aria-label="Cerrar imagen"
          >
            ×
          </button>
        </div>
      </div>

      <div
        className="relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden p-3 sm:p-6"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={(event) => {
          event.preventDefault();
          changeScale(scale + (event.deltaY < 0 ? 0.25 : -0.25));
        }}
        onDoubleClick={() => {
          if (scale > 1) resetTransform();
          else changeScale(2.5);
        }}
      >
        <img
          src={image.src}
          alt={image.alt}
          draggable={false}
          data-no-image-zoom="true"
          className="max-h-full max-w-full select-none object-contain"
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
            transformOrigin: "center center",
            transition: pointersRef.current.size > 0 ? "none" : "transform 120ms ease-out",
            cursor: scale > 1 ? "grab" : "zoom-in",
          }}
        />
      </div>

      <div className="shrink-0 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 text-center text-[11px] text-white/70">
        Pellizca o usa +/− para ampliar · arrastra para mover · doble toque/clic para ampliar o restablecer
      </div>
    </div>
  );
}
