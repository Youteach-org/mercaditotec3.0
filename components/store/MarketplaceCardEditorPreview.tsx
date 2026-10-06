"use client";

import MarketplaceCloudMedia from "./MarketplaceCloudMedia";
import MarketplaceRibbon from "./MarketplaceRibbon";
import {
  marketplaceVariantIndex,
  resolveMarketplaceVariant,
} from "@/lib/store/marketplacePresentation";
import type { MarketplaceVariant } from "@/lib/store/domain";

function PreviewPinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mkt-pin-icon" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export default function MarketplaceCardEditorPreview({
  storeId,
  name,
  description,
  deliveryLocation,
  logoUrl,
  coverUrl,
  label,
  note,
  tags,
  variant,
}: {
  storeId: string;
  name: string;
  description: string;
  deliveryLocation: string;
  logoUrl: string | null;
  coverUrl: string | null;
  label: string;
  note: string;
  tags: string[];
  variant: MarketplaceVariant | "";
}) {
  const resolved = resolveMarketplaceVariant(variant || null, storeId || "preview");
  const index = marketplaceVariantIndex(resolved);
  const displayName = name.trim() || "Tu tienda";
  const displayDescription = description.trim() || "Aquí aparecerá la descripción de tu tienda.";
  const displayLabel = label.trim() || displayName;
  const displayNote = note.trim();
  const displayTags = tags.length > 0 ? tags.slice(0, 3) : ["Categoría"];

  return (
    <div className="mkt-editor-card-preview">
      <div className="mkt-editor-card-preview-head">
        <div>
          <div className="mkt-editor-card-preview-kicker">Vista real en Mercadito</div>
          <p>Usa exactamente las mismas capas y estilos que la tarjeta pública.</p>
        </div>
        <span>Nube {index + 1}</span>
      </div>

      <div className="mkt-editor-card-stage">
        <article className={`mkt-store-card mkt-store-card-0 mkt-store-variant-${index}`}>
          <div className="mkt-store-photo">
            <MarketplaceCloudMedia
              variantIndex={index}
              imageUrl={coverUrl}
              fallbackLabel="FOTO"
            />
          </div>

          <MarketplaceRibbon label={displayLabel} slotIndex={0} />

          <div className="mkt-store-logo">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" />
            ) : (
              <span className="mkt-demo-logo mkt-demo-logo-0">
                {displayName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          <div className="mkt-store-copy">
            <div className="mkt-store-copy-main">
              <h3>{displayName}</h3>
              <p>{displayDescription}</p>
              <div className="mkt-store-details">
                {displayTags.map((tag) => (
                  <span key={tag} className="mkt-tag">{tag}</span>
                ))}
              </div>
              {deliveryLocation.trim() && (
                <div className="mkt-store-location">
                  <PreviewPinIcon />
                  {deliveryLocation.trim()}
                </div>
              )}
            </div>
          </div>

          {displayNote && (
            <div className="mkt-hand-note mkt-hand-note-0">{displayNote}</div>
          )}
        </article>
      </div>

      <div className="mkt-editor-visible-fields">
        <span>Portada</span>
        <span>Rótulo</span>
        <span>Logo</span>
        <span>Nombre</span>
        <span>Descripción</span>
        <span>Etiquetas</span>
        <span>Entrega</span>
        <span>Post-it</span>
        <span>Forma</span>
      </div>
    </div>
  );
}
