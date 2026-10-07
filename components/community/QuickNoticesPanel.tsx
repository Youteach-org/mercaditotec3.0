"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { User } from "firebase/auth";

import {
  createCommunityPostRequest,
  loadCommunityPosts,
} from "@/lib/community/client";
import type { CommunityPostApiRecord } from "@/lib/community/http";

export default function QuickNoticesPanel({
  user,
  visualPreview = false,
}: {
  user: User | null;
  visualPreview?: boolean;
}) {
  const [posts, setPosts] = useState<CommunityPostApiRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || visualPreview) {
      setPosts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      setPosts(await loadCommunityPosts(user, { limit: 4 }));
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

  async function publishNotice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || submitting) return;

    setSubmitting(true);
    setError("");

    try {
      await createCommunityPostRequest(user, {
        type: "quick_notice",
        title,
        body,
        location,
        imageUrl: null,
      });
      setTitle("");
      setBody("");
      setLocation("");
      setComposerOpen(false);
      await refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo publicar el aviso.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const composer =
    composerOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="mkt-quick-modal-backdrop"
            onMouseDown={() => !submitting && setComposerOpen(false)}
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
                onClick={() => setComposerOpen(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
              <p className="mkt-quick-modal-kicker">Comunidad Mercadito</p>
              <h2 id="quick-notice-title">Publicar aviso rápido</h2>
              <p className="mkt-quick-modal-help">
                Para preguntas o avisos breves del campus. Si encontraste un objeto,
                publícalo en Cosas perdidas para agregar una foto.
              </p>
              <form onSubmit={publishNotice} className="mkt-quick-form">
                <label>
                  Título
                  <input
                    required
                    maxLength={80}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Ej. ¿Alguien vio unas llaves?"
                  />
                </label>
                <label>
                  Mensaje
                  <textarea
                    required
                    maxLength={500}
                    rows={4}
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder="Escribe lo necesario para que otros alumnos puedan ayudarte."
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
                    onClick={() => setComposerOpen(false)}
                    disabled={submitting}
                  >
                    Cancelar
                  </button>
                  <button type="submit" disabled={submitting}>
                    {submitting ? "Publicando..." : "Publicar aviso"}
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
        ) : (
          <div className="mkt-quick-list">
            {posts.map((post) => {
              const content = (
                <>
                  <div className="mkt-quick-item-title">
                    {post.type === "found_item" && (
                      <span className="mkt-quick-kind">Encontrado</span>
                    )}
                    <strong>{post.title}</strong>
                  </div>
                  <p>{post.body}</p>
                  {post.location && <small>📍 {post.location}</small>}
                </>
              );

              return post.type === "found_item" ? (
                <Link
                  key={post.id}
                  href="/cosas-perdidas"
                  className="mkt-quick-item"
                >
                  {content}
                </Link>
              ) : (
                <article key={post.id} className="mkt-quick-item">
                  {content}
                </article>
              );
            })}
          </div>
        )}

        {error && <p className="mkt-quick-error">{error}</p>}

        <div className="mkt-quick-actions">
          {user && !visualPreview ? (
            <button type="button" onClick={() => setComposerOpen(true)}>
              + Publicar aviso
            </button>
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
