"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { User } from "firebase/auth";

import {
  createCommunityPostRequest,
  loadCommunityPosts,
} from "@/lib/community/client";
import type { CommunityPostApiRecord } from "@/lib/community/http";
import { buildCommunityPostMediaPath } from "@/lib/community/media";
import { uploadImageFile } from "@/lib/imageStorage";
import { validateMediaFileMeta } from "@/lib/store/media";

type ComposerMode = "notice" | "found" | null;

export default function QuickNoticesPanel({
  user,
  visualPreview = false,
}: {
  user: User | null;
  visualPreview?: boolean;
}) {
  const [posts, setPosts] = useState<CommunityPostApiRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [composerMode, setComposerMode] = useState<ComposerMode>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [location, setLocation] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const foundPhotoRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    if (!user || visualPreview) {
      setPosts([]);
      setCurrentIndex(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const nextPosts = await loadCommunityPosts(user, { limit: 12 });
      setPosts(nextPosts);
      setCurrentIndex((current) =>
        nextPosts.length === 0 ? 0 : Math.min(current, nextPosts.length - 1),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar los avisos.",
      );
    } finally {
      setLoading(false);
    }
  }, [user, visualPreview]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const currentPost = posts[currentIndex] ?? null;

  function moveNotice(direction: -1 | 1) {
    if (posts.length <= 1) return;
    setCurrentIndex((current) => {
      const next = current + direction;
      if (next < 0) return posts.length - 1;
      if (next >= posts.length) return 0;
      return next;
    });
  }

  function handleTouchStart(event: React.TouchEvent<HTMLElement>) {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLElement>) {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start === null) return;

    const end = event.changedTouches[0]?.clientX ?? start;
    const delta = end - start;
    if (Math.abs(delta) < 35) return;
    moveNotice(delta < 0 ? 1 : -1);
  }

  function resetComposer() {
    setTitle("");
    setBody("");
    setLocation("");
    setPhoto(null);
    if (foundPhotoRef.current) foundPhotoRef.current.value = "";
  }

  function closeComposer() {
    if (submitting) return;
    setComposerMode(null);
    resetComposer();
  }

  async function publishPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || submitting || !composerMode) return;

    if (composerMode === "found" && !photo) {
      setError("Agrega una foto del objeto encontrado.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      let imageUrl: string | null = null;

      if (composerMode === "found" && photo) {
        validateMediaFileMeta(photo);
        const path = buildCommunityPostMediaPath({
          ownerUid: user.uid,
          nonce: crypto.randomUUID(),
          mimeType: photo.type,
        });
        imageUrl = await uploadImageFile({ path, file: photo });
      }

      await createCommunityPostRequest(user, {
        type: composerMode === "found" ? "found_item" : "quick_notice",
        title,
        body,
        location,
        imageUrl,
      });

      setComposerMode(null);
      resetComposer();
      setCurrentIndex(0);
      await refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo publicar.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const composer =
    composerMode && typeof document !== "undefined"
      ? createPortal(
          <div
            className="mkt-quick-modal-backdrop"
            onMouseDown={closeComposer}
          >
            <section
              className="mkt-quick-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="quick-notice-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="mkt-quick-modal-close"
                onClick={closeComposer}
                aria-label="Cerrar"
              >
                ×
              </button>

              <p className="mkt-quick-modal-kicker">COMUNIDAD MERCADITO</p>
              <h2 id="quick-notice-title">
                {composerMode === "found"
                  ? "Publicar objeto encontrado"
                  : "Publicar aviso rápido"}
              </h2>
              <p className="mkt-quick-modal-help">
                {composerMode === "found"
                  ? "Sube una foto y los datos básicos. También aparecerá automáticamente en Avisos rápidos."
                  : "Para preguntas, avisos breves o algo que necesites comunicar rápido dentro del campus."}
              </p>

              <form onSubmit={publishPost} className="mkt-quick-form">
                {composerMode === "found" && (
                  <label>
                    Foto del objeto
                    <input
                      ref={foundPhotoRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      required
                      onChange={(event) =>
                        setPhoto(event.target.files?.[0] ?? null)
                      }
                    />
                    <span>La imagen se optimiza antes de subirla.</span>
                  </label>
                )}

                <label>
                  {composerMode === "found" ? "¿Qué encontraste?" : "Título"}
                  <input
                    required
                    maxLength={80}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={
                      composerMode === "found"
                        ? "Ej. Termo negro"
                        : "Ej. ¿Alguien vio unas llaves?"
                    }
                  />
                </label>

                <label>
                  {composerMode === "found" ? "Descripción" : "Mensaje"}
                  <textarea
                    required
                    maxLength={500}
                    rows={4}
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder={
                      composerMode === "found"
                        ? "Describe detalles que ayuden a identificarlo."
                        : "Escribe lo necesario para que otros alumnos puedan ayudarte."
                    }
                  />
                </label>

                <label>
                  Lugar <span>(opcional)</span>
                  <input
                    maxLength={120}
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="Ej. Biblioteca"
                  />
                </label>

                <div className="mkt-quick-form-actions">
                  <button
                    type="button"
                    onClick={closeComposer}
                    disabled={submitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={
                      submitting || (composerMode === "found" && !photo)
                    }
                  >
                    {submitting
                      ? "Publicando..."
                      : composerMode === "found"
                        ? "Publicar encontrado"
                        : "Publicar aviso"}
                  </button>
                </div>
              </form>
            </section>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <section className="mkt-quick-notices" aria-label="Avisos rápidos">
        <div className="mkt-quick-notices-head">
          <div>
            <span>COMUNIDAD</span>
            <h2>Avisos rápidos</h2>
          </div>
          <Link href="/cosas-perdidas">Cosas perdidas →</Link>
        </div>

        {!user || visualPreview ? (
          <div className="mkt-quick-empty">
            <p>Inicia sesión para ver y publicar avisos de la comunidad.</p>
            {!visualPreview && <Link href="/login">Iniciar sesión</Link>}
          </div>
        ) : loading ? (
          <p className="mkt-quick-status">Cargando avisos…</p>
        ) : posts.length === 0 ? (
          <div className="mkt-quick-empty">
            <p>Todavía no hay avisos. Puedes publicar el primero.</p>
          </div>
        ) : currentPost ? (
          <div className="mkt-quick-carousel">
            <div className="mkt-quick-carousel-bar">
              <button
                type="button"
                className="mkt-quick-nav"
                onClick={() => moveNotice(-1)}
                disabled={posts.length <= 1}
                aria-label="Aviso anterior"
              >
                ‹
              </button>
              <span className="mkt-quick-counter">
                {currentIndex + 1}/{posts.length}
              </span>
              <button
                type="button"
                className="mkt-quick-nav"
                onClick={() => moveNotice(1)}
                disabled={posts.length <= 1}
                aria-label="Aviso siguiente"
              >
                ›
              </button>
            </div>

            <article
              className="mkt-quick-card"
              tabIndex={0}
              aria-live="polite"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") moveNotice(-1);
                if (event.key === "ArrowRight") moveNotice(1);
              }}
            >
              {currentPost.imageUrl && (
                <div className="mkt-quick-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={currentPost.imageUrl} alt="" />
                </div>
              )}

              <div className="mkt-quick-card-copy">
                <div className="mkt-quick-item-title">
                  <span
                    className={
                      currentPost.type === "found_item"
                        ? "mkt-quick-kind mkt-quick-kind-found"
                        : "mkt-quick-kind"
                    }
                  >
                    {currentPost.type === "found_item" ? "Encontrado" : "Aviso"}
                  </span>
                  <strong>{currentPost.title}</strong>
                </div>
                <p>{currentPost.body}</p>
                {currentPost.location && (
                  <small>📍 {currentPost.location}</small>
                )}
                {currentPost.type === "found_item" && (
                  <Link
                    href="/cosas-perdidas"
                    className="mkt-quick-open-found"
                  >
                    Ver en Cosas perdidas →
                  </Link>
                )}
              </div>
            </article>

            <p className="mkt-quick-swipe-hint">
              {posts.length > 1 ? "Desliza o usa las flechas" : "Aviso más reciente"}
            </p>
          </div>
        ) : null}

        {error && <p className="mkt-quick-error">{error}</p>}

        <div className="mkt-quick-actions">
          {user && !visualPreview ? (
            <>
              <button
                type="button"
                onClick={() => {
                  resetComposer();
                  setComposerMode("notice");
                }}
              >
                + Aviso
              </button>
              <button
                type="button"
                onClick={() => {
                  resetComposer();
                  setComposerMode("found");
                }}
              >
                + Encontré algo
              </button>
            </>
          ) : (
            <Link href={visualPreview ? "/cosas-perdidas" : "/login"}>
              {visualPreview ? "Ver cosas perdidas" : "Participar"}
            </Link>
          )}
        </div>
      </section>
      {composer}
    </>
  );
}
