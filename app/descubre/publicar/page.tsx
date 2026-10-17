"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { User } from "firebase/auth";
import { useSession } from "@/lib/useSession";
import { prepareImageForUpload, uploadImageFile } from "@/lib/imageStorage";
import type { CategoryIconKey } from "@/lib/store/categoryIcon";
import CategoryIcon from "@/components/store/CategoryIcon";
import DiscoverProductCard from "@/components/descubre/DiscoverProductCard";
import { DEFAULT_LISTING_HOURS, LISTING_DURATIONS_HOURS, listingDurationLabel, listingExpiryMs } from "@/lib/descubre/lifecycle";
import type { PersonalDiscoverProduct } from "@/lib/descubre/feed";
import { normalizeWhatsappNumber } from "@/lib/security/whatsapp";
import type { StoreApiRecord } from "@/lib/store/client";
import "../descubre.css";
import "./publicar.css";

interface Category { id: string; name: string; iconKey: CategoryIconKey }
interface MyListing { id: string; title: string; status: string; screeningReason: string | null; createdAt: number; expiresAt: number | null }

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
  const { firebaseUser, appUser, loading: sessionLoading } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [mine, setMine] = useState<MyListing[]>([]);
  const [stores, setStores] = useState<StoreApiRecord[]>([]);
  const [linkedStoreId, setLinkedStoreId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priceType, setPriceType] = useState<"fixed" | "negotiable" | "ask">("fixed");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [duration, setDuration] = useState(DEFAULT_LISTING_HOURS);
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
      requestWithUser(firebaseUser, "/api/stores").then(async (response) => {
        if (!response.ok) throw new Error("No se pudieron consultar tus tiendas.");
        return response.json();
      }),
    ]).then(([cats, own, ownStores]) => {
      if (!active) return;
      setCategories(Array.isArray(cats.categories) ? cats.categories : []);
      setMine(Array.isArray(own.listings) ? own.listings : []);
      setStores(Array.isArray(ownStores.stores) ? ownStores.stores : []);
    }).catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "Error al cargar datos."); });
    return () => { active = false; };
  }, [firebaseUser]);

  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const registeredWhatsapp = appUser?.whatsappNumber?.trim() ?? "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!firebaseUser || busy) return;
    if (!file || !categoryId || !title.trim() || !description.trim() || !location.trim()) {
      setMessage("Agrega fotografía, categoría, título, descripción y lugar de entrega.");
      return;
    }
    if (!registeredWhatsapp && !whatsappNumber.trim()) {
      setMessage("Agrega tu número de WhatsApp para que puedan contactarte.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (!registeredWhatsapp) {
        const normalized = normalizeWhatsappNumber(whatsappNumber);
        setStep("Guardando WhatsApp de contacto…");
        const profileResponse = await requestWithUser(firebaseUser, "/api/profile", {
          method: "PATCH",
          body: JSON.stringify({ whatsappNumber: normalized }),
        });
        const profileData = await profileResponse.json().catch(() => ({}));
        if (!profileResponse.ok) {
          throw new Error(profileData.error ?? "No se pudo guardar tu WhatsApp.");
        }
      }
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
          linkedStoreId: linkedStoreId || null,
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

  const approvedStores = stores.filter((store) => store.status === "active" && store.slug);
  const selectedStore = approvedStores.find((store) => store.id === linkedStoreId);
  const previewAmount = Number(price);
  const liveProduct: PersonalDiscoverProduct = {
    id: "vista-previa",
    personal: true,
    sellerUid: firebaseUser?.uid ?? "",
    expiresAt: Date.now() + duration * 60 * 60 * 1000,
    linkedStoreId: selectedStore?.id ?? null,
    storeId: selectedStore?.id ?? "",
    storeSlug: selectedStore?.slug ?? "",
    storeName: selectedStore?.name ?? appUser?.nickname ?? "Tu anuncio",
    storeLogoUrl: selectedStore?.logoUrl ?? null,
    deliveryLocation: location.trim(),
    title: title.trim(),
    description: description.trim(),
    imageUrl: preview,
    categoryId,
    priceType,
    priceAmount: priceType === "ask" ? null : Number.isFinite(previewAmount) && previewAmount > 0 ? previewAmount : null,
    createdAt: new Date().toISOString(),
    flashEndsAt: duration <= 48 ? new Date(Date.now() + duration * 60 * 60 * 1000).toISOString() : null,
  };

  if (sessionLoading || !firebaseUser) {
    return <main className="discover-page discover-loading">Cargando…</main>;
  }

  return (
    <main className="discover-page">
      <div className="discover-paper-top" aria-hidden="true" />
      <div className="discover-inner">
        <header className="publish-header">
          <Link href="/descubre" className="publish-back">← Volver a Descubre</Link>
          <h1>PON TUS IDEAS A LA VENTA <span aria-hidden="true">✳</span></h1>
          <p>Vende algo a la comunidad, con o sin tienda.</p>
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
                  {LISTING_DURATIONS_HOURS.map((hours) => (
                    <option key={hours} value={hours}>{hours <= 48 ? "Oferta flash · " : "Anuncio · "}{listingDurationLabel(hours)}</option>
                  ))}
                </select>
                <small>Se retira automáticamente cuando termine el plazo, aunque no regreses.</small>
              </label>
            </div>
            <fieldset className="publish-field publish-store-link">
              <legend>8. ¿Quieres ligar el anuncio a tu tienda?</legend>
              {approvedStores.length > 0 ? (
                <>
                  <label className="publish-store-option">
                    <input type="radio" name="linked-store" checked={!linkedStoreId} onChange={() => setLinkedStoreId("")} />
                    Publicar como usuario independiente
                  </label>
                  {approvedStores.map((store) => (
                    <label key={store.id} className="publish-store-option">
                      <input type="radio" name="linked-store" checked={linkedStoreId === store.id} onChange={() => setLinkedStoreId(store.id)} />
                      Vincular a {store.name}
                    </label>
                  ))}
                  <small>Solo puedes vincular tiendas tuyas aprobadas. La tarjeta mostrará el nombre y logo de tu tienda.</small>
                </>
              ) : (
                <p className="publish-store-promo">¿Quieres vender más seguido? <strong>¡Abre tu tienda en Mercadito!</strong> Tu anuncio también puede publicarse sin tener una.</p>
              )}
              <Link className="publish-create-store" href="/mystore">
                {stores.length ? "Administrar mis tiendas ↗" : "＋ Crear mi tienda ↗"}
              </Link>
            </fieldset>
            <fieldset className="publish-field publish-whatsapp">
              <legend>9. Contacto por WhatsApp</legend>
              {registeredWhatsapp ? (
                <>
                  <p>Los interesados podrán contactarte por WhatsApp al número registrado: <strong>{registeredWhatsapp}</strong></p>
                  <Link href="/profile" className="publish-whatsapp-edit">Cambiar número en mi perfil ↗</Link>
                </>
              ) : (
                <label className="publish-whatsapp-input">
                  <span>Tu número de WhatsApp</span>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="443 123 4567"
                    maxLength={24}
                    required
                    value={whatsappNumber}
                    onChange={(event) => setWhatsappNumber(event.target.value)}
                  />
                  <small>Se guardará en tu perfil. Solo los usuarios que hayan iniciado sesión podrán contactarte desde tu anuncio.</small>
                </label>
              )}
            </fieldset>
            <p className="publish-policy">No se permite anunciar alcohol, drogas ni vapeadores. Todas las publicaciones pasan por revisión automática de fotografía y texto.</p>
            {message && <p role="alert" className="publish-error">{message}</p>}
            {step && <p role="status" className="publish-step">{step}</p>}
            <button className="publish-submit" type="submit" disabled={busy || categories.length === 0}>
              {busy ? "Revisando…" : "✦ Publicar ahora"}
            </button>
          </form>
          <aside className="publish-side">
            <section className="publish-preview-pane" aria-label="Vista previa de tu anuncio">
              <h2>Así se verá tu anuncio ✳</h2>
              <p>Los cambios aparecen aquí mientras escribes. Es la misma tarjeta de Descubre.</p>
              <div className="publish-preview-card"><DiscoverProductCard product={liveProduct} preview /></div>
              <small>Vista previa: todavía no está publicado.</small>
            </section>
            <div className="publish-note">♡ <strong>¡Haz espacio para algo nuevo!</strong><p>Tu producto aparece en Descubre después de aprobar la revisión.</p></div>
            <section className="publish-mine">
              <h2>Mis anuncios</h2>
              {mine.length === 0 ? <p>Todavía no tienes anuncios.</p> : mine.map((item) => (
                <Link key={item.id} href={"/descubre/anuncios/" + encodeURIComponent(item.id)}>
                  <strong>{item.title}</strong>
                  <small>{item.status === "approved" && listingExpiryMs(item) <= Date.now() ? "Vencido" : item.status === "approved" ? "Publicado" : item.status === "sold" ? "Vendido" : item.status === "blocked" ? "No permitido" : item.status === "screening" ? "En revisión" : "Requiere cambios"}</small>
                </Link>
              ))}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
