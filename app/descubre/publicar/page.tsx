"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { User } from "firebase/auth";
import { useSession } from "@/lib/useSession";
import { prepareImageForUpload, uploadImageFile } from "@/lib/imageStorage";
import type { CategoryIconKey } from "@/lib/store/categoryIcon";
import CategoryIcon from "@/components/store/CategoryIcon";
import "../descubre.css";
import "./publicar.css";

interface Category { id: string; name: string; iconKey: CategoryIconKey }
interface MyListing { id: string; title: string; status: string; screeningReason: string | null; createdAt: number }

async function requestWithUser(user: User, path: string, init?: RequestInit): Promise<Response> {
  return fetch(path, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: "Bearer " + await user.getIdToken(),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
}
const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
};

export default function PublicarDescubre() {
  const router = useRouter();
  const { firebaseUser, loading: sessionLoading } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [mine, setMine] = useState<MyListing[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priceType, setPriceType] = useState<"fixed" | "negotiable" | "ask">("fixed");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [duration, setDuration] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!sessionLoading && !firebaseUser) router.replace("/login");
  }, [firebaseUser, sessionLoading, router]);

  useEffect(() => {
    if (!firebaseUser) return;
    let active = true;
    void Promise.all([
      fetch("/api/categories", { cache: "no-store" }).then((response) => {
        if (!response.ok) throw new Error("No se pudieron cargar las categorías.");
        return response.json();
      }),
      requestWithUser(firebaseUser, "/api/descubre/anuncios").then(async (response) => {
        if (!response.ok) throw new Error("No se pudieron consultar tus anuncios.");
        return response.json();
      }),
    ]).then(([cats, own]) => {
      if (!active) return;
      setCategories(Array.isArray(cats.categories) ? cats.categories : []);
      setMine(Array.isArray(own.listings) ? own.listings : []);
    }).catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "Error al cargar datos."); });
    return () => { active = false; };
  }, [firebaseUser]);

  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!firebaseUser || busy) return;
    if (!file || !categoryId || !title.trim() || !description.trim() || !location.trim()) {
      setMessage("Agrega fotografía, categoría, título, descripción y lugar de entrega.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      setStep("Optimizando la fotografía…");
      const prepared = await prepareImageForUpload(file, file.name);
      const ext = EXT[prepared.type];
      if (!ext) throw new Error("Usa una foto JPG, PNG o WebP.");
      const path = "discover-listings/" + firebaseUser.uid + "/" + crypto.randomUUID() + "." + ext;
      setStep("Subiendo la fotografía…");
      const imageUrl = await uploadImageFile({ path, file: prepared, filename: prepared.name });
      const amount = Number(price);
      if (priceType !== "ask" && (!Number.isFinite(amount) || amount <= 0)) {
        throw new Error("Ingresa un precio válido.");
      }
      setStep("Revisando la foto y el anuncio automáticamente…");
      const response = await requestWithUser(firebaseUser, "/api/descubre/anuncios", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(), description: description.trim(),
          categoryId, location: location.trim(), imageUrl, priceType,
          priceAmount: priceType === "ask" ? null : amount,
          durationHours: duration,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.status !== "approved") {
        throw new Error(result.message || result.error || "El anuncio no superó la revisión automática. Corrígelo e inténtalo de nuevo.");
      }
      router.push("/descubre/anuncios/" + encodeURIComponent(result.id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible publicar el anuncio.");
    } finally {
      setBusy(false);
      setStep("");
    }
  }

  if (sessionLoading || !firebaseUser) {
    return <main className="discover-page discover-loading">Cargando…</main>;
  }

  return (
    <main className="discover-page">
      <div className="discover-paper-top" aria-hidden="true" />
      <div className="discover-inner">
        <header className="publish-header">
          <Link href="/descubre" className="publish-back">← Volver a Descubre</Link>
          <h1>¡Publica tu hallazgo! <span aria-hidden="true">✳</span></h1>
          <p>Vende algo a la comunidad sin crear una tienda.</p>
        </header>
        <div className="publish-layout">
          <form className="publish-form" onSubmit={submit}>
            <label className="publish-field publish-photo">
              <strong>1. Fotografía del producto</strong>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required />
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Vista previa de tu producto" />
              ) : (
                <span className="publish-photo-placeholder">＋<br />Agrega una foto clara de lo que vendes</span>
              )}
              <small>JPG, PNG o WebP. Se comprime automáticamente a menos de 1 MB.</small>
            </label>
            <label className="publish-field">
              <strong>2. ¿Qué vendes?</strong>
              <input type="text" maxLength={100} minLength={2} required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ejemplo: Televisión de 43 pulgadas" />
            </label>
            <label className="publish-field">
              <strong>3. Describe tu producto</strong>
              <textarea maxLength={750} rows={3} required value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Estado, características y qué incluye…" />
            </label>
            <fieldset className="publish-field publish-categories">
              <legend>4. Elige una categoría</legend>
              <div className="publish-category-grid">
                {categories.map((category) => (
                  <button type="button" key={category.id} aria-pressed={categoryId === category.id} className={categoryId === category.id ? "publish-category selected" : "publish-category"} onClick={() => setCategoryId(category.id)}>
                    <span className="publish-category-icon"><CategoryIcon id={category.iconKey} /></span>
                    <span>{category.name}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="publish-form-row">
              <label className="publish-field">
                <strong>5. Precio</strong>
                <select value={priceType} onChange={(event) => setPriceType(event.target.value as typeof priceType)}>
                  <option value="fixed">Precio fijo</option>
                  <option value="negotiable">Negociable</option>
                  <option value="ask">Preguntar precio</option>
                </select>
              </label>
              {priceType !== "ask" && (
                <label className="publish-field">
                  <strong>Pesos mexicanos ($)</strong>
                  <input type="number" step="0.01" min="1" max="1000000" value={price} onChange={(event) => setPrice(event.target.value)} required placeholder="250" />
                </label>
              )}
            </div>
            <div className="publish-form-row">
              <label className="publish-field">
                <strong>6. Lugar de entrega</strong>
                <input type="text" maxLength={120} value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Ejemplo: Entrada del Tec" required />
              </label>
              <label className="publish-field">
                <strong>7. ¿Cuánto dura el anuncio?</strong>
                <select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
                  <option value={0}>Hasta que lo marques vendido</option>
                  <option value={6}>Oferta flash · 6 horas</option>
                  <option value={12}>Oferta flash · 12 horas</option>
                  <option value={24}>Oferta flash · 24 horas</option>
                  <option value={48}>Oferta flash · 48 horas</option>
                </select>
              </label>
            </div>
            <p className="publish-policy">No se permite anunciar alcohol, drogas ni vapeadores. Todas las publicaciones pasan por revisión automática de fotografía y texto.</p>
            {message && <p role="alert" className="publish-error">{message}</p>}
            {step && <p role="status" className="publish-step">{step}</p>}
            <button className="publish-submit" type="submit" disabled={busy || categories.length === 0}>
              {busy ? "Revisando…" : "✦ Publicar ahora"}
            </button>
          </form>
          <aside className="publish-side">
            <div className="publish-note">♡ <strong>¡Haz espacio para algo nuevo!</strong><p>Tu producto aparece en Descubre después de aprobar la revisión.</p></div>
            <section className="publish-mine">
              <h2>Mis anuncios</h2>
              {mine.length === 0 ? <p>Todavía no tienes anuncios.</p> : mine.map((item) => (
                <Link key={item.id} href={"/descubre/anuncios/" + encodeURIComponent(item.id)}>
                  <strong>{item.title}</strong>
                  <small>{item.status === "approved" ? "Publicado" : item.status === "sold" ? "Vendido" : item.status === "blocked" ? "No permitido" : item.status === "screening" ? "En revisión" : "Requiere cambios"}</small>
                </Link>
              ))}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
