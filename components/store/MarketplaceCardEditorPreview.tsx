"use client";

import MarketplaceCloudMedia from "./MarketplaceCloudMedia";
import {
  marketplaceVariantIndex,
  resolveMarketplaceVariant,
} from "@/lib/store/marketplacePresentation";
import type { MarketplaceVariant } from "@/lib/store/domain";



const NOTE_STYLES = [
  "bg-[#ffd54c] text-[#103d88] -rotate-3",
  "bg-[#ffc1d0] text-[#6b163e] rotate-2",
  "bg-[#bfe9ff] text-[#103d88] -rotate-2",
  "bg-[#ff9a63] text-[#103d88] rotate-3",
  "bg-[#fff0ca] text-[#103d88] -rotate-1",
  "bg-[#ffd54c] text-[#103d88] rotate-2",
] as const;

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
  const displayNote = note.trim() || "TU POST-IT";
  const displayTags = tags.length > 0 ? tags.slice(0, 3) : ["Categoría"];

  return (
    <div className="rounded-2xl border border-[#eadfce] bg-[#fff9ee] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[.16em] text-[#1457c5]">Vista de tarjeta en Mercadito</div>
          <p className="mt-1 text-xs text-slate-500">Así se combinan la nube, el rótulo, el papel de información y el post-it.</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm">Nube {index + 1}</span>
      </div>

      <div className="relative mx-auto h-[330px] w-full max-w-[390px]">
        <div className="absolute inset-x-[7%] top-[2%] h-[66%]">
          <MarketplaceCloudMedia
            variantIndex={index}
            imageUrl={coverUrl}
            fallbackLabel="FOTO"
          />
        </div>

        <div className="absolute left-[5%] top-[9%] z-30 max-w-[68%] -rotate-3 bg-[#ffd54c] px-3 py-2 font-black text-[#103d88] shadow-sm [clip-path:polygon(0_18%,8%_7%,22%_12%,38%_3%,55%_10%,72%_4%,88%_12%,100%_7%,96%_84%,84%_79%,70%_91%,53%_82%,36%_92%,18%_83%,3%_90%)]">
          {displayLabel}
        </div>

        <div className="absolute bottom-[2%] left-[10%] right-[8%] z-40 min-h-[40%] bg-white px-5 pb-4 pt-7 shadow-[0_8px_18px_rgba(13,52,121,.10)] [clip-path:polygon(2%_14%,10%_5%,22%_9%,34%_2%,47%_7%,60%_1%,73%_8%,87%_4%,99%_13%,96%_29%,100%_44%,96%_60%,99%_76%,91%_91%,78%_86%,64%_96%,50%_90%,36%_97%,22%_89%,9%_95%,1%_83%,5%_66%,1%_49%,5%_31%)]">
          <div className="absolute -top-5 left-5 z-50 grid h-12 w-12 place-items-center overflow-hidden rounded-full border-4 border-white bg-[#1457c5] text-sm font-black text-white shadow-md">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              displayName.slice(0, 2).toUpperCase()
            )}
          </div>

          <h3 className="text-lg font-black leading-tight text-[#103d88]">{displayName}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">{displayDescription}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {displayTags.map((tag) => (
              <span key={tag} className="rounded-full bg-[#fff0ca] px-2 py-1 text-[10px] font-bold text-[#103d88]">{tag}</span>
            ))}
          </div>
          {deliveryLocation.trim() && (
            <div className="mt-2 text-[10px] font-semibold text-slate-500">⌖ {deliveryLocation.trim()}</div>
          )}
        </div>

        <div className={`absolute bottom-[7%] right-0 z-[60] w-[31%] px-3 py-3 text-center text-xs font-black leading-tight shadow-md [clip-path:polygon(3%_8%,96%_2%,100%_90%,7%_100%,0_17%)] ${NOTE_STYLES[index]}`}>
          {displayNote}
        </div>
      </div>
    </div>
  );
}
