"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { DiscoverFeedItem } from "@/lib/descubre/feed";

interface Props {
  product: DiscoverFeedItem;
  index?: number;
  preview?: boolean;
}

export function discoverPrice(product: DiscoverFeedItem): string {
  if (product.priceType === "ask" || product.priceAmount === null) return "Pregunta precio";
  const formatted = new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN", maximumFractionDigits: 2,
  }).format(product.priceAmount);
  return product.priceType === "negotiable" ? formatted + " · negociable" : formatted;
}

export function isFlash(product: DiscoverFeedItem, now = Date.now()): boolean {
  return Boolean(product.flashEndsAt && Date.parse(product.flashEndsAt) > now);
}

export default function DiscoverProductCard({ product, index = 0, preview = false }: Props) {
  const personal = "personal" in product && product.personal;
  const href = personal
    ? "/descubre/anuncios/" + encodeURIComponent(product.id)
    : "/marketplace/stores/" + encodeURIComponent(product.storeSlug) + "#producto-" + encodeURIComponent(product.id);

  const card: ReactNode = (
    <>
      <div className="discover-product-photo">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.title || "Fotografía del producto"} loading={preview || index > 3 ? "lazy" : "eager"} />
        ) : (
          <span className="discover-product-photo-placeholder">✳<small>Tu fotografía</small></span>
        )}
      </div>
      {isFlash(product) && <span className="discover-product-flash">⚡ ¡Flash!</span>}
      <div className="discover-product-copy">
        <h2>{product.title || "Nombre de tu producto"}</h2>
        {product.description && <p>{product.description}</p>}
        <span className="discover-product-price">{discoverPrice(product)}</span>
      </div>
    </>
  );

  return (
    <article className={"discover-product discover-product-" + (index % 8) + (preview ? " discover-product-preview" : "")}>
      <div className="discover-product-tape" aria-hidden="true" />
      {preview ? (
        <div className="discover-product-link" aria-label="Vista previa del anuncio">
          {card}
        </div>
      ) : (
        <Link href={href} prefetch={false} className="discover-product-link" aria-label={"Ver " + product.title + " de " + product.storeName}>
          {card}
        </Link>
      )}
      <div className="discover-product-meta">
        <span className="discover-seller">
          {product.storeLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.storeLogoUrl} alt="" loading="lazy" />
          ) : <span className="discover-seller-icon" aria-hidden="true">▣</span>}
          <span>{product.storeName || "Tu nombre"}</span>
        </span>
        {product.deliveryLocation && <span className="discover-location"><span aria-hidden="true">⌖</span>{product.deliveryLocation}</span>}
      </div>
    </article>
  );
}
