"use client";

import { useCallback, useEffect, useState } from "react";

import AuthGuard from "@/components/AuthGuard";
import {
  createCommunityPostRequest,
  loadCommunityPosts,
  resolveCommunityPostRequest,
} from "@/lib/community/client";
import type { CommunityPostApiRecord } from "@/lib/community/http";
import {
  buildCommunityPostMediaPath,
} from "@/lib/community/media";
import { uploadImageFile } from "@/lib/imageStorage";
import { isAdministrativeBlockActive } from "@/lib/moderation/domain";
import { validateMediaFileMeta } from "@/lib/store/media";
import { useSession } from "@/lib/useSession";

function LostAndFoundContent() {
  const { firebaseUser, appUser } = useSession();
  const [posts, setPosts] = useState<CommunityPostApiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [location, setLocation] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const blocked = Boolean(appUser && isAdministrativeBlockActive(appUser));

  const refresh = useCallback(async () => {
    if (!firebaseUser) return;

    setLoading(true);
    setMessage("");
    try {
      setPosts(
        await loadCommunityPosts(firebaseUser, {
          type: "found_item",
          limit: 50,
        }),
      );
    } catch (loadError) {
      setMessage(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar los objetos encontrados.",
      );
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submitFoundItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!firebaseUser || !photo || submitting || blocked) return;

    setSubmitting(true);
    setMessage("");

    try {
      validateMediaFileMeta(photo);
      const path = buildCommunityPostMediaPath({
        ownerUid: firebaseUser.uid,
        nonce: crypto.randomUUID(),
        mimeType: photo.type,
      });
      const imageUrl = await uploadImageFile({ path, file: photo });

      await createCommunityPostRequest(firebaseUser, {
        type: "found_item",
        title,
        body,
        location,
        imageUrl,
      });

      setTitle("");
      setBody("");
      setLocation("");
      setPhoto(null);
      const input = document.getElementById("lost-item-photo") as HTMLInputElement | null;
      if (input) input.value = "";
      setMessage("Objeto publicado. También aparecerá en Avisos rápidos.");
      await refresh();
    } catch (submitError) {
      setMessage(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo publicar el objeto encontrado.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function resolve(postId: string) {
    if (!firebaseUser || resolvingId || blocked) return;

    setResolvingId(postId);
    setMessage("");
    try {
      await resolveCommunityPostRequest(firebaseUser, postId);
      setPosts((current) => current.filter((post) => post.id !== postId));
      setMessage("Dueño encontrado. La publicación ya no aparece entre los objetos pendientes.");
    } catch (resolveError) {
      setMessage(
        resolveError instanceof Error
          ? resolveError.message
          : "No se pudo resolver la publicación.",
      );
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <main className="lost-found-page">
      <section className="lost-found-hero">
        <div className="lost-found-hero-copy">
          <span>ENTRE ESTUDIANTES</span>
          <h1>Cosas perdidas</h1>
          <p>
            ¿Encontraste algo en el campus? Súbelo aquí para que llegue más fácil
            a su dueño. Cada publicación también aparece en los Avisos rápidos del
            Mercadito.
          </p>
        </div>
        <div className="lost-found-hero-note">
          Encontrar algo también es cuidar a la comunidad ♡
        </div>
      </section>

      <div className="lost-found-layout">
        <section className="lost-found-form-card">
          <div className="lost-found-section-title">
            <span>01</span>
            <div>
              <p>PUBLICAR</p>
              <h2>Encontré algo</h2>
            </div>
          </div>

          {blocked && (
            <div className="lost-found-blocked">
              Tu cuenta puede consultar publicaciones, pero no publicar o resolver
              objetos mientras el bloqueo esté activo.
            </div>
          )}

          <form onSubmit={submitFoundItem} className="lost-found-form">
            <label>
              Foto del objeto
              <input
                id="lost-item-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                required
                disabled={blocked}
                onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
              />
              <small>JPEG, PNG, WebP o GIF · máximo 1 MB.</small>
            </label>

            <label>
              ¿Qué encontraste?
              <input
                required
                maxLength={80}
                disabled={blocked}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ej. Termo negro"
              />
            </label>

            <label>
              Descripción
              <textarea
                required
                maxLength={500}
                rows={5}
                disabled={blocked}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Describe detalles que ayuden a identificarlo."
              />
            </label>

            <label>
              ¿Dónde lo encontraste? <span>(opcional)</span>
              <input
                maxLength={120}
                disabled={blocked}
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Ej. Laboratorio de cómputo"
              />
            </label>

            <button type="submit" disabled={blocked || submitting || !photo}>
              {submitting ? "Publicando..." : "Publicar objeto encontrado"}
            </button>
          </form>
          {message && <p className="lost-found-message">{message}</p>}
        </section>

        <section className="lost-found-feed">
          <div className="lost-found-section-title">
            <span>02</span>
            <div>
              <p>RECIENTES</p>
              <h2>Objetos encontrados</h2>
            </div>
          </div>

          {loading ? (
            <div className="lost-found-empty">Cargando publicaciones…</div>
          ) : posts.length === 0 ? (
            <div className="lost-found-empty">
              Todavía no hay objetos encontrados publicados.
            </div>
          ) : (
            <div className="lost-found-grid">
              {posts.map((post) => (
                <article key={post.id} className="lost-found-card">
                  {post.imageUrl && (
                    <button
                      type="button"
                      className="lost-found-image-button"
                      onClick={() => setZoomImage(post.imageUrl)}
                      aria-label={`Ampliar foto de ${post.title}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={post.imageUrl} alt={post.title} />
                    </button>
                  )}
                  <div className="lost-found-card-body">
                    <span className="lost-found-badge">Encontrado</span>
                    <h3>{post.title}</h3>
                    <p>{post.body}</p>
                    {post.location && (
                      <p className="lost-found-place">📍 {post.location}</p>
                    )}
                    <time dateTime={post.createdAt}>
                      {new Date(post.createdAt).toLocaleString("es-MX", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </time>
                    {post.authorUid === firebaseUser?.uid && (
                      <button
                        type="button"
                        className="lost-found-resolve"
                        disabled={blocked || resolvingId === post.id}
                        onClick={() => void resolve(post.id)}
                      >
                        {resolvingId === post.id
                          ? "Marcando..."
                          : "Dueño encontrado"}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {zoomImage && (
        <div
          className="lost-found-zoom"
          role="dialog"
          aria-modal="true"
          onMouseDown={() => setZoomImage(null)}
        >
          <button
            type="button"
            onClick={() => setZoomImage(null)}
            aria-label="Cerrar imagen"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoomImage}
            alt="Vista ampliada del objeto encontrado"
            onMouseDown={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
}

export default function LostAndFoundPage() {
  return (
    <AuthGuard>
      <LostAndFoundContent />
    </AuthGuard>
  );
}
