"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/useSession";
import "../../descubre.css";

interface Listing {
  id: string;
  ownerUid: string;
  sellerName: string;
  title: string;
  description: string;
  imageUrl: string;
  location: string;
  priceType: "fixed" | "negotiable" | "ask";
  priceAmount: number | null;
  status: string;
  expiresAt: number | null;
  screeningReason: string | null;
}

export default function DescubreListingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { firebaseUser, loading } = useSession();
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!loading && !firebaseUser) router.replace("/login");
  }, [loading, firebaseUser, router]);
  useEffect(() => {
    if (!firebaseUser || !params.id) return;
    const controller = new AbortController();
    void firebaseUser.getIdToken().then((token) => fetch("/api/descubre/anuncios/" + encodeURIComponent(params.id), {
      signal: controller.signal,
      cache: "no-store",
      headers: { Authorization: "Bearer " + token },
    })).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Anuncio no disponible.");
      if (!controller.signal.aborted) setListing(result.listing);
    }).catch((reason) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "No se pudo cargar el anuncio.");
    });
    return () => controller.abort();
  }, [firebaseUser, params.id]);

  async function markSold() {
    if (!firebaseUser || !listing || saving) return;
    setSaving(true);
    try {
      const response = await fetch("/api/descubre/anuncios/" + encodeURIComponent(listing.id), {
        method: "PATCH",
        cache: "no-store",
        headers: { Authorization: "Bearer " + await firebaseUser.getIdToken(), "Content-Type": "application/json" },
        body: JSON.stringify({ status: "sold" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo actualizar.");
      setListing({ ...listing, status: "sold" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo marcar como vendido.");
    } finally { setSaving(false); }
  }

  const amount = listing?.priceAmount;
  const price = amount === null || amount === undefined ? "Preguntar precio" :
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);
  const owner = listing?.ownerUid === firebaseUser?.uid;
  return (
    <main className="discover-page">
      <div className="discover-paper-top" aria-hidden="true" />
      <div className="discover-inner" style={{ maxWidth: 1060 }}>
        <div style={{ margin: "22px 0" }}><Link href="/descubre" style={{ color: "#123d82", fontWeight: 900 }}>← Volver a Descubre</Link></div>
        {error && <p role="alert" style={{ color: "#a42318", padding: 14, background: "#fff1ee", fontWeight: 800 }}>{error}</p>}
        {!listing && !error && <p>Cargando anuncio…</p>}
        {listing && (
          <article style={{ background: "#fffdf7", border: "5px solid #ffd54c", padding: "clamp(14px, 3vw, 35px)", boxShadow: "7px 9px 0 #123d82", display: "grid", gap: 20 }}>
            <h1 style={{ margin: 0, fontFamily: "var(--font-market-hand), cursive", fontSize: "clamp(32px, 5vw, 55px)", lineHeight: 1.15 }}>{listing.title}</h1>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 20 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={listing.imageUrl} alt={listing.title} style={{ width: "100%", maxHeight: 460, objectFit: "contain", background: "#fff0c8" }} />
              <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
                <strong style={{ display: "inline-block", fontSize: "clamp(27px, 3.5vw, 42px)", background: "#ffd54c", padding: "8px 13px", transform: "rotate(-2deg)", width: "fit-content" }}>{price}</strong>
                {listing.priceType === "negotiable" && <strong>Precio negociable</strong>}
                <p style={{ whiteSpace: "pre-wrap", fontSize: 17, lineHeight: 1.5, overflowWrap: "anywhere" }}>{listing.description}</p>
                <p><strong>Vende:</strong> {listing.sellerName}</p>
                <p><strong>Entrega:</strong> {listing.location}</p>
                {listing.status === "sold" && <p role="status"><strong>✓ Vendido</strong></p>}
                {listing.status === "blocked" && <p>Publicación no permitida: {listing.screeningReason}</p>}
                {listing.status === "needs_changes" && <p>Esta publicación requiere cambios: {listing.screeningReason}</p>}
                {listing.status === "screening" && <p>En revisión automática; todavía no es visible.</p>}
                {listing.status === "approved" && (owner ? (
                  <button type="button" onClick={markSold} disabled={saving} style={{ cursor: "pointer", background: "#f15b32", color: "#fff", padding: 14, border: 0, fontWeight: 900, fontSize: 17 }}>
                    {saving ? "Guardando…" : "✓ Marcar como vendido"}
                  </button>
                ) : (
                  <Link href={"/chat/personal/" + encodeURIComponent(listing.ownerUid)} style={{ display: "block", textAlign: "center", background: "#f15b32", color: "white", padding: 14, fontWeight: 900, fontSize: 17 }}>
                    Contactar al vendedor →
                  </Link>
                ))}
                {owner && <Link href="/descubre/publicar" style={{ color: "#123d82", fontWeight: 900 }}>Mis anuncios y publicar otro →</Link>}
              </div>
            </div>
          </article>
        )}
      </div>
    </main>
  );
}
