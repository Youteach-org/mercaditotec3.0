"use client";

// Marketplace page intentionally triggers deploy after cache-control changes.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import QuickNoticesPanel from "@/components/community/QuickNoticesPanel";
import MarketplaceCloudMedia from "@/components/store/MarketplaceCloudMedia";
import MarketplaceRibbon from "@/components/store/MarketplaceRibbon";

import {
  DEMO_MARKETPLACE_STORES,
  type DemoMarketplaceCategory,
  type DemoMarketplaceStore,
} from "@/lib/store/demoMarketplace";
import {
  DEFAULT_MARKETPLACE_CONTENT,
  type MarketplaceContent,
} from "@/lib/store/marketplaceContent";
import {
  marketplaceVariantIndex,
  resolveMarketplaceVariant,
} from "@/lib/store/marketplacePresentation";
import { shouldUseMarketplaceDemo } from "@/lib/store/marketplacePreview";
import type { PublicStoreSummary } from "@/lib/store/publicMarketplace";
import type { StoreCategoryApiRecord } from "@/lib/store/categoryClient";
import type { CategoryIconKey } from "@/lib/store/categoryIcon";
import CategoryIcon from "@/components/store/CategoryIcon";
import { useSession } from "@/lib/useSession";

type CategoryVisualId = "all" | CategoryIconKey;
type DemoCategoryVisualId = "all" | DemoMarketplaceCategory;

const SHOW_TEMPORARY_EXAMPLE_STORES = true;

const DEMO_CATEGORY_ITEMS: Array<{ id: DemoCategoryVisualId; label: string }> = [
  { id: "food", label: "Comida" },
  { id: "drinks", label: "Bebidas" },
  { id: "desserts", label: "Postres" },
  { id: "crafts", label: "Artesanías" },
  { id: "stationery", label: "Papelería" },
  { id: "all", label: "Más categorías" },
];


function inferredCategory(store: PublicStoreSummary): DemoMarketplaceCategory {
  if ("demoCategory" in store) {
    return (store as DemoMarketplaceStore).demoCategory;
  }

  const text = `${store.name} ${store.description ?? ""}`.toLocaleLowerCase("es-MX");
  if (/postre|pastel|cupcake|brownie|galleta|dulce/.test(text)) return "desserts";
  if (/café|cafe|bebida|jugo|frapp|té|te\b/.test(text)) return "drinks";
  if (/artesan|joyer|accesorio|hecho a mano/.test(text)) return "crafts";
  if (/papeler|libreta|cuaderno|pluma|útil|util/.test(text)) return "stationery";
  return "food";
}

function categoryLabel(
  category: DemoMarketplaceCategory,
  labels: MarketplaceContent["categoryLabels"],
): string {
  return labels[category] ?? "Tienda";
}

function MultilineText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, index, lines) => (
        <span key={`${line}-${index}`}>
          {line}
          {index < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mkt-search-icon" fill="none" stroke="currentColor" strokeWidth="2.2">
      <circle cx="10.5" cy="10.5" r="6.7" />
      <path d="m16 16 5 5" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mkt-pin-icon" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}


function MarketplaceClipDefs() {
  return (
    <svg className="mkt-clip-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="mkt-title-cut" clipPathUnits="objectBoundingBox">
          <path d="M.018,.15 L.055,.075 L.135,.095 L.205,.05 L.292,.078 L.382,.042 L.475,.07 L.565,.035 L.66,.075 L.752,.045 L.845,.082 L.948,.06 L.985,.145 L.968,.245 L.992,.34 L.97,.445 L.99,.55 L.962,.655 L.985,.76 L.95,.865 L.875,.91 L.79,.892 L.705,.95 L.61,.918 L.515,.968 L.415,.93 L.32,.972 L.225,.925 L.13,.96 L.055,.91 L.02,.835 L.035,.735 L.012,.63 L.032,.525 L.01,.415 L.038,.305 L.015,.215 Z" />
        </clipPath>

        <clipPath id="mkt-cloud-0" clipPathUnits="objectBoundingBox">
          <path d="M.08,.16 C.10,.07 .19,.045 .27,.075 C.33,.02 .43,.025 .49,.07 C.56,.02 .68,.025 .73,.075 C.82,.035 .91,.08 .92,.17 C.985,.20 .995,.30 .95,.36 C.995,.43 .995,.53 .95,.59 C.99,.68 .95,.78 .87,.80 C.86,.90 .76,.95 .68,.91 C.62,.975 .51,.985 .44,.94 C.36,.985 .25,.965 .21,.90 C.12,.94 .04,.87 .05,.79 C.00,.73 .015,.62 .065,.58 C.015,.50 .02,.40 .07,.35 C.02,.28 .025,.20 .08,.16 Z" />
        </clipPath>

        <clipPath id="mkt-cloud-1" clipPathUnits="objectBoundingBox">
          <path d="M.055,.20 C.055,.11 .14,.055 .22,.08 C.29,.025 .39,.035 .45,.075 C.52,.02 .63,.02 .69,.07 C.78,.035 .88,.07 .90,.15 C.975,.18 .995,.28 .955,.35 C.995,.42 .995,.52 .95,.59 C.985,.69 .94,.78 .86,.80 C.83,.90 .73,.94 .65,.90 C.58,.97 .47,.98 .40,.93 C.31,.97 .21,.94 .18,.87 C.09,.90 .02,.83 .045,.75 C.00,.68 .015,.58 .06,.54 C.015,.46 .02,.35 .065,.31 C.02,.27 .02,.23 .055,.20 Z" />
        </clipPath>

        <clipPath id="mkt-cloud-2" clipPathUnits="objectBoundingBox">
          <path d="M.045,.18 C.065,.095 .14,.055 .22,.08 C.28,.025 .39,.03 .45,.07 C.52,.025 .62,.02 .68,.065 C.76,.025 .87,.055 .90,.14 C.975,.16 .995,.26 .955,.33 C.995,.40 .995,.50 .955,.56 C.99,.65 .95,.74 .88,.77 C.86,.87 .76,.92 .68,.89 C.61,.95 .51,.965 .44,.925 C.35,.97 .25,.95 .20,.885 C.11,.92 .035,.855 .05,.78 C.005,.72 .01,.61 .055,.565 C.01,.49 .015,.39 .06,.34 C.02,.28 .015,.22 .045,.18 Z" />
        </clipPath>

        <clipPath id="mkt-cloud-3" clipPathUnits="objectBoundingBox">
          <path d="M.065,.17 C.075,.09 .15,.055 .23,.08 C.30,.025 .40,.03 .46,.07 C.54,.02 .65,.03 .70,.075 C.79,.035 .89,.075 .91,.16 C.98,.19 .995,.29 .955,.36 C.995,.44 .99,.54 .945,.60 C.985,.69 .94,.79 .86,.81 C.83,.90 .73,.94 .65,.90 C.58,.97 .47,.98 .40,.93 C.31,.97 .22,.94 .18,.87 C.09,.91 .02,.84 .045,.76 C.00,.69 .015,.59 .06,.54 C.015,.46 .02,.36 .065,.31 C.02,.25 .025,.20 .065,.17 Z" />
        </clipPath>

        <clipPath id="mkt-cloud-4" clipPathUnits="objectBoundingBox">
          <path d="M.045,.21 C.055,.12 .14,.07 .22,.09 C.29,.035 .38,.04 .45,.075 C.53,.025 .63,.03 .69,.07 C.78,.035 .88,.07 .91,.15 C.98,.18 .995,.28 .955,.35 C.995,.43 .99,.53 .95,.59 C.99,.68 .95,.77 .87,.80 C.85,.89 .75,.94 .67,.90 C.60,.965 .50,.97 .43,.925 C.34,.97 .24,.945 .20,.88 C.11,.91 .035,.85 .05,.77 C.005,.70 .015,.60 .06,.55 C.015,.48 .02,.38 .065,.33 C.02,.27 .02,.23 .045,.21 Z" />
        </clipPath>

        <clipPath id="mkt-cloud-5" clipPathUnits="objectBoundingBox">
          <path d="M.04,.19 C.055,.105 .135,.06 .215,.085 C.28,.03 .38,.03 .445,.07 C.52,.02 .63,.025 .69,.07 C.78,.03 .88,.06 .91,.145 C.98,.17 .995,.27 .955,.34 C.995,.42 .99,.52 .95,.58 C.99,.67 .95,.76 .875,.79 C.85,.885 .75,.93 .67,.895 C.60,.96 .50,.97 .43,.925 C.34,.97 .24,.945 .19,.88 C.10,.915 .03,.85 .05,.775 C.005,.705 .015,.605 .06,.555 C.015,.48 .02,.38 .06,.33 C.02,.27 .015,.22 .04,.19 Z" />
        </clipPath>

        <clipPath id="mkt-copy-0" clipPathUnits="objectBoundingBox">
          <path d="M.03,.12 L.14,.07 L.27,.10 L.39,.05 L.52,.09 L.66,.04 L.80,.09 L.96,.06 L.98,.28 L.95,.48 L.99,.70 L.95,.91 L.80,.88 L.66,.94 L.51,.89 L.36,.95 L.22,.89 L.07,.93 L.02,.72 L.05,.51 L.01,.31 Z" />
        </clipPath>
        <clipPath id="mkt-copy-1" clipPathUnits="objectBoundingBox">
          <path d="M.02,.11 L.15,.06 L.29,.10 L.43,.05 L.57,.09 L.71,.04 L.85,.09 L.98,.06 L.97,.29 L.99,.51 L.96,.73 L.98,.91 L.83,.88 L.68,.94 L.53,.89 L.37,.95 L.22,.89 L.06,.93 L.03,.72 L.05,.50 L.01,.29 Z" />
        </clipPath>
        <clipPath id="mkt-copy-2" clipPathUnits="objectBoundingBox">
          <path d="M.03,.10 L.18,.06 L.31,.10 L.46,.05 L.60,.09 L.74,.04 L.88,.09 L.98,.08 L.96,.30 L.99,.50 L.96,.72 L.98,.90 L.84,.88 L.70,.94 L.55,.89 L.40,.95 L.24,.89 L.07,.93 L.03,.73 L.05,.52 L.01,.31 Z" />
        </clipPath>
      </defs>
    </svg>
  );
}

function StudentIllustration() {
  return (
    <svg viewBox="0 0 390 220" aria-hidden="true" className="mkt-students-svg">
      <g fill="none" stroke="#123b83" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5">
        {/* Student 1: headphones + backpack */}
        <path d="M42 86c0-31 15-50 40-50 26 0 42 20 42 51" />
        <path d="M49 83c-10-2-17 6-16 17 1 10 8 16 18 14M116 83c10-2 17 6 16 17-1 10-8 16-18 14" />
        <path d="M53 77c4-24 17-36 32-36 16 0 28 13 31 36" />
        <ellipse cx="83" cy="79" rx="27" ry="31" fill="#fffaf0" />
        <path d="M61 62c8-16 28-21 44-11M68 82h1M94 82h1M72 96c7 7 15 7 22 0" />
        <path d="M48 191c3-50 14-78 36-78 23 0 36 28 40 78" fill="#f47b3f" />
        <path d="M57 125c-14 13-21 32-22 57M111 126c16 13 25 31 28 56" />
        <path d="M46 143c-17 4-25 20-21 38M121 141c16 5 24 18 24 37" />
        <path d="M57 129c-13 8-19 20-21 35M109 129c12 9 18 20 20 35" strokeWidth="3.5" />

        {/* Student 2: long hair + notebook */}
        <ellipse cx="196" cy="82" rx="25" ry="29" fill="#fffaf0" />
        <path d="M172 77c0-26 13-42 32-42 18 0 32 17 31 44M174 63c7-17 24-24 43-15" />
        <path d="M181 83h1M205 83h1M184 96c6 6 14 6 20 0" />
        <path d="M162 191c3-49 14-79 35-79 21 0 34 30 37 79" fill="#fffaf0" />
        <path d="M166 126c-13 10-21 26-23 50M226 127c14 12 21 28 23 49" />
        <path d="M178 143h42v31h-42z" fill="#fffaf0" />
        <path d="M185 151h27M185 158h24M185 165h18" strokeWidth="3" />

        {/* Student 3: ponytail + shoulder bag */}
        <ellipse cx="306" cy="79" rx="26" ry="30" fill="#fffaf0" />
        <path d="M282 73c1-25 14-39 33-39 17 0 30 14 32 35M286 58c8-15 25-21 42-12" />
        <path d="M332 47c20 3 28 15 24 31M291 80h1M316 80h1M294 95c7 6 15 6 22 0" />
        <path d="M269 191c4-49 17-79 38-79 22 0 36 30 40 79" fill="#fffaf0" />
        <path d="M276 129c-15 12-23 27-25 48M338 130c15 12 22 28 24 47" />
        <path d="M326 121c11 16 17 36 19 61" strokeWidth="3.5" />
        <path d="M338 154c14 1 24 9 28 23" />
      </g>

      <g fill="none" stroke="#f15b32" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4.5">
        <path d="M14 58l15 7M19 43l7 13M359 57l15-10M363 72l18 1" />
        <path d="M245 60c8-15 19-14 23-5 4-10 15-10 19-1 4 12-9 21-20 29-11-8-24-14-22-23Z" />
        <path d="M351 112c7-13 17-12 20-4 3-8 13-9 16-1 4 10-7 18-16 25-9-6-21-12-20-20Z" />
      </g>

      <g fill="#f47b3f" stroke="#123b83" strokeWidth="3">
        <path d="M38 133c8-7 14-8 21-4l-2 18-20 0 1-14Z" />
      </g>
    </svg>
  );
}

function Doodle({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`mkt-doodle ${className}`} aria-hidden="true">{children}</span>;
}

function DemoLogo({ index, name }: { index: number; name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("");

  return <span className={`mkt-demo-logo mkt-demo-logo-${index % 6}`}>{initials}</span>;
}

function StoreCard({
  store,
  slotIndex,
  previewMode,
  requiresLogin,
  onPreview,
  gallery = false,
  categoryLabels,
}: {
  store: PublicStoreSummary;
  slotIndex: number;
  previewMode: boolean;
  requiresLogin: boolean;
  onPreview: (store: PublicStoreSummary) => void;
  gallery?: boolean;
  categoryLabels: MarketplaceContent["categoryLabels"];
}) {
  const demo = "demoRating" in store ? (store as DemoMarketplaceStore) : null;
  const variant = resolveMarketplaceVariant(store.marketplaceVariant, store.id);
  const variantIndex = marketplaceVariantIndex(variant);
  const tags =
    store.marketplaceTags.length > 0
      ? store.marketplaceTags
      : demo?.demoTags ?? [categoryLabel(inferredCategory(store), categoryLabels)];
  const rating = demo?.demoRating ?? null;
  const reviewCount = demo?.demoReviewCount ?? null;
  const ribbonLabel = store.marketplaceLabel.trim() || store.name;
  const note = store.marketplaceNote.trim();
  const storeHref = `/marketplace/stores/${store.slug}`;

  const body = (
    <article className={`mkt-store-card mkt-store-card-${slotIndex} mkt-store-variant-${variantIndex}`}>
      <div className="mkt-store-photo">
        <MarketplaceCloudMedia
          variantIndex={variantIndex}
          imageUrl={store.coverUrl}
          fallbackLabel="TIENDA"
          storeHref={!previewMode && !demo ? (requiresLogin ? "/login" : storeHref) : undefined}
        />
      </div>

      <MarketplaceRibbon label={ribbonLabel} slotIndex={slotIndex} />

      <div className="mkt-store-logo">
        {store.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={store.logoUrl}
            alt={`Logo de ${store.name}`}
            data-force-image-zoom="true"
            data-image-double-href={!previewMode && !demo ? (requiresLogin ? "/login" : storeHref) : undefined}
          />
        ) : (
          <DemoLogo index={variantIndex} name={store.name} />
        )}
      </div>

      <div className="mkt-store-copy">
        <div className="mkt-store-copy-main">
          <h3>{store.name}</h3>
          <p>{store.description || "Conoce esta tienda y lo que ofrece."}</p>
          <div className="mkt-store-details">
            {rating !== null && reviewCount !== null && (
              <span className="mkt-rating"><b>★</b> {rating.toFixed(1)} ({reviewCount})</span>
            )}
            {tags.map((tag) => (
              <span key={tag} className="mkt-tag">{tag}</span>
            ))}
          </div>
          {store.deliveryLocation && (
            <div className="mkt-store-location"><PinIcon /> {store.deliveryLocation}</div>
          )}
        </div>
      </div>

      {note && (
        <div className={`mkt-hand-note mkt-hand-note-${slotIndex}`}>{note}</div>
      )}
    </article>
  );

  const className = [
    "mkt-store-slot",
    gallery ? "mkt-more-store" : `mkt-store-slot-${slotIndex}`,
    `mkt-store-variant-${variantIndex}`,
  ].join(" ");

  if (previewMode || demo) {
    return (
      <button type="button" className={className} onClick={() => onPreview(store)} aria-label={`Previsualizar ${store.name}`}>
        {body}
      </button>
    );
  }

  return (
    <Link
      href={requiresLogin ? "/login" : storeHref}
      className={className}
      onClickCapture={(event) => {
        // The image has its own 1-tap zoom / 2-tap navigation gesture.
        // Prevent Next Link navigation even if a delegated click handler
        // is registered before the global viewer on this device.
        const target = event.target;
        if (
          target instanceof Element &&
          target.closest(".mkt-store-photo, .mkt-store-logo")
        ) {
          event.preventDefault();
        }
      }}
    >
      {body}
    </Link>
  );
}

export default function MarketplacePage() {
  const { firebaseUser, loading: sessionLoading } = useSession();
  const [liveStores, setLiveStores] = useState<PublicStoreSummary[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<number | null>(null);
  const [activeStores, setActiveStores] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [storePage, setStorePage] = useState(0);
  const [category, setCategory] = useState("all");
  const [approvedCategories, setApprovedCategories] = useState<StoreCategoryApiRecord[]>([]);
  const [previewStore, setPreviewStore] = useState<PublicStoreSummary | null>(null);
  const [forceDemo, setForceDemo] = useState(false);
  const [marketplaceContent, setMarketplaceContent] = useState<MarketplaceContent>(
    DEFAULT_MARKETPLACE_CONTENT,
  );

  useEffect(() => {
    setForceDemo(
      shouldUseMarketplaceDemo(window.location.search, window.location.hostname),
    );
  }, []);

  useEffect(() => {
    const visualPreview = shouldUseMarketplaceDemo(
      window.location.search,
      window.location.hostname,
    );
    if (visualPreview) {
      setForceDemo(true);
      setLoading(false);
      setError("");
      return;
    }

    let cancelled = false;

    void fetch("/api/marketplace-v2", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "No se pudo cargar el Mercadito.");
        if (!cancelled) {
          setLiveStores(Array.isArray(data.stores) ? data.stores : []);
          setActiveStores(typeof data.realStoreCount === "number" ? data.realStoreCount : null);
          setApprovedCategories(Array.isArray(data.categories) ? data.categories : []);
          if (data.content) setMarketplaceContent(data.content as MarketplaceContent);
        }
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el Mercadito.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (sessionLoading || !firebaseUser || forceDemo) {
      setRegisteredUsers(null);
      return;
    }
    let cancelled = false;
    void firebaseUser.getIdToken()
      .then((token) => fetch("/api/community-stats", {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      }))
      .then(async (response) => {
        if (!response.ok) throw new Error("No se pudo consultar el contador");
        return response.json();
      })
      .then((data: { registeredUsers?: unknown }) => {
        if (!cancelled) {
          setRegisteredUsers(
            typeof data.registeredUsers === "number" && data.registeredUsers >= 0
              ? data.registeredUsers
              : null,
          );
        }
      })
      .catch(() => {
        if (!cancelled) setRegisteredUsers(null);
      });
    return () => { cancelled = true; };
  }, [firebaseUser, sessionLoading, forceDemo]);

  const effectiveLoading = forceDemo ? false : loading;
  const effectiveError = forceDemo ? "" : error;
  const previewMode = forceDemo || (!loading && !error && liveStores.length === 0);
  const temporaryExamples = useMemo(() => {
    if (!SHOW_TEMPORARY_EXAMPLE_STORES || previewMode) return [];
    return DEMO_MARKETPLACE_STORES
      .filter((demoStore) => !liveStores.some((liveStore) => liveStore.id === demoStore.id));
  }, [liveStores, previewMode]);
  const sourceStores: PublicStoreSummary[] = previewMode
    ? DEMO_MARKETPLACE_STORES
    : [...liveStores, ...temporaryExamples];
  const normalizedQuery = query.trim().toLocaleLowerCase("es-MX");

  const categoryItems = useMemo(() => {
    if (previewMode) {
      return DEMO_CATEGORY_ITEMS.map((item) => ({
        id: item.id,
        label:
          item.id === "all"
            ? "Todas"
            : marketplaceContent.categoryLabels[item.id],
        visualId: item.id,
      }));
    }

    const active = approvedCategories.filter((item) => item.active);
    const selectedIds =
      marketplaceContent.marketplaceCategoryIds.length > 0
        ? marketplaceContent.marketplaceCategoryIds
        : active.slice(0, 5).map((item) => item.id);
    const selectedSet = new Set(selectedIds);

    return [
      ...active
        .filter((item) => selectedSet.has(item.id))
        .slice(0, 5)
        .map((item) => ({
          id: item.id,
          label: item.name,
          visualId: item.iconKey,
        })),
      { id: "all", label: "Todas", visualId: "all" as const },
    ];
  }, [
    approvedCategories,
    marketplaceContent.categoryLabels,
    marketplaceContent.marketplaceCategoryIds,
    previewMode,
  ]);

  const filteredStores = useMemo(() => {
    const categoryNames = new Map(
      approvedCategories.map((item) => [item.id, item.name]),
    );

    const matchingStores = sourceStores.filter((store) => {
      const demo = "demoCategory" in store;
      const categoryMatch =
        category === "all" ||
        (demo
          ? inferredCategory(store) === category
          : (store.categoryIds ?? []).includes(category));

      const searchableCategories = (store.categoryIds ?? [])
        .map((categoryId) => categoryNames.get(categoryId) ?? "")
        .filter(Boolean);

      const queryMatch =
        !normalizedQuery ||
        [
          store.name,
          store.description,
          store.deliveryLocation,
          ...store.marketplaceTags,
          ...searchableCategories,
        ]
          .filter(Boolean)
          .some((value) =>
            value.toLocaleLowerCase("es-MX").includes(normalizedQuery),
          );

      return categoryMatch && queryMatch;
    });
    // Keep demos for previews, but suppress demos that would reach the second page.
    return previewMode ? matchingStores : matchingStores.filter((store, index) => index < 18 || !("demoCategory" in store));
  }, [approvedCategories, category, normalizedQuery, sourceStores, previewMode]);

  const featured = filteredStores.slice(0, 6);
  const additionalStores = filteredStores.slice(6);
  const storesPerPage = 12;
  const pageCount = Math.max(1, Math.ceil(additionalStores.length / storesPerPage));
  const currentStorePage = Math.min(storePage, pageCount - 1);
  const visibleAdditionalStores = additionalStores.slice(currentStorePage * storesPerPage, (currentStorePage + 1) * storesPerPage);

  function showNextStores() {
    if (additionalStores.length === 0) return;
    setStorePage((current) => (current + 1) % pageCount);
    window.setTimeout(() => document.getElementById("more-stores")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  return (
    <main className="mkt-page">
      <MarketplaceClipDefs />
      <section className="mkt-approved-canvas" aria-label="Mercadito Tec">
        <div className="mkt-market-photo" aria-hidden="true">
          <div className="mkt-market-photo-shade" />
        </div>
        <div className="mkt-bunting" aria-hidden="true">
          <span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span />
        </div>

        <div className="mkt-title-paper">
          <h1>
            {marketplaceContent.heroTitle}
            <strong>{marketplaceContent.heroEmphasis}</strong>
          </h1>
          <p className="mkt-hero-subtitle">{marketplaceContent.heroSubtitle.replace(/\s+/g, " ").trim()}</p>
        {!sessionLoading && firebaseUser && !forceDemo && (registeredUsers !== null || activeStores !== null) && (
            <div className="mkt-community-counts" aria-label="Cifras de la comunidad">
              {registeredUsers !== null && (
                <div className="mkt-community-count">
                  <div className="mkt-community-figure">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M19 14a5 5 0 0 1 2 4v2"/>
                    </svg>
                    <strong>{registeredUsers.toLocaleString("es-MX")}</strong>
                  </div>

                </div>
              )}
              {activeStores !== null && (
                <div className="mkt-community-count">
                  <div className="mkt-community-figure">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 9 5 3h14l2 6v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0V9ZM5 14v7h14v-7M9 21v-7h6v7"/>
                    </svg>
                    <strong>{activeStores.toLocaleString("es-MX")}</strong>
                  </div>

                </div>
              )}
            </div>
          )}

        </div>

        <div className="mkt-pink-note"><MultilineText text={marketplaceContent.pinkNote} /></div>
        <div className="mkt-blue-note"><MultilineText text={marketplaceContent.blueNote} /></div>
        <div className="mkt-orange-note"><MultilineText text={marketplaceContent.orangeNote} /></div>

        <Doodle className="mkt-rays-left">❯❯</Doodle>
        <Doodle className="mkt-heart-title">♡</Doodle>
        <Doodle className="mkt-rays-search">///</Doodle>

        {!effectiveLoading && !effectiveError && !sessionLoading && firebaseUser && (
          <div className="mkt-bottom-blue">
            <QuickNoticesPanel user={firebaseUser} visualPreview={forceDemo} />
          </div>
        )}

        <form className="mkt-search" onSubmit={(event) => event.preventDefault()}>
          <SearchIcon />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={marketplaceContent.searchPlaceholder}
            aria-label="Buscar tiendas"
          />
          <button type="submit">{marketplaceContent.searchButtonLabel}</button>
        </form>

        <div className="mkt-category-strip" aria-label="Categorías">
          {categoryItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={category === item.id ? "mkt-category-button is-active" : "mkt-category-button"}
              onClick={() => setCategory(item.id)}
            >
              <span className="mkt-category-icon-wrap"><CategoryIcon id={item.visualId} /></span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="mkt-students-art">
          <StudentIllustration />
          <div className="mkt-students-note"><MultilineText text={marketplaceContent.studentsNote} /></div>
        </div>

        <div className="mkt-featured-heading">
          <span className="mkt-featured-brush" aria-hidden="true" />
          <h2>{marketplaceContent.featuredHeading}</h2>
          <span className="mkt-star" aria-hidden="true">☆</span>
        </div>

        {effectiveLoading && <div className="mkt-canvas-message">Cargando tiendas…</div>}
        {!effectiveLoading && effectiveError && <div className="mkt-canvas-message mkt-canvas-error">{effectiveError}</div>}
        {!effectiveLoading && !effectiveError && featured.length === 0 && (
          <div className="mkt-canvas-message">No encontramos coincidencias.</div>
        )}

        {!effectiveLoading && !effectiveError && (
          <>
            <div className="mkt-bottom-campus" aria-hidden="true" />

            {featured.map((store, index) => (
              <StoreCard
                key={store.id}
                store={store}
                slotIndex={index}
                previewMode={previewMode}
                requiresLogin={!firebaseUser || sessionLoading}
                onPreview={setPreviewStore}
                categoryLabels={marketplaceContent.categoryLabels}
              />
            ))}

            <button type="button" className="mkt-discover-note" onClick={showNextStores} disabled={additionalStores.length === 0} aria-label="Descubre más tiendas">{marketplaceContent.discoverLabel} <span>→</span></button>
            <div className="mkt-future-note"><MultilineText text={marketplaceContent.futureNote} /></div>
          </>
        )}

        <Doodle className="mkt-squiggle-a">∿</Doodle>
        <Doodle className="mkt-squiggle-b">⌁</Doodle>
        <Doodle className="mkt-squiggle-c">♡</Doodle>
        <Doodle className="mkt-squiggle-d">✦</Doodle>
      </section>

      {!effectiveLoading && !effectiveError && additionalStores.length > 0 && (
        <section id="more-stores" className="mkt-more-section" aria-label="Más tiendas de la comunidad">
          <div className="mkt-more-heading">
            <span>{marketplaceContent.moreStoresHeading}</span>
            <b aria-hidden="true">↘</b>
          </div>
          <div className="mkt-more-stores">
            {visibleAdditionalStores.map((store, index) => (
              <StoreCard
                key={store.id}
                store={store}
                slotIndex={index % 6}
                gallery
                previewMode={previewMode}
                requiresLogin={!firebaseUser || sessionLoading}
                onPreview={setPreviewStore}
                categoryLabels={marketplaceContent.categoryLabels}
              />
            ))}
          </div>
          {pageCount > 1 && <div className="mkt-store-pagination" aria-label="Páginas de tiendas"><button type="button" disabled={currentStorePage === 0} onClick={() => setStorePage(currentStorePage - 1)}>← Anterior</button><span>Página {currentStorePage + 1} de {pageCount}</span><button type="button" disabled={currentStorePage + 1 >= pageCount} onClick={() => setStorePage(currentStorePage + 1)}>Siguiente →</button></div>}
        </section>
      )}

      {previewStore && (
        <div className="mkt-modal-backdrop" onMouseDown={() => setPreviewStore(null)}>
          <section className="mkt-modal" role="dialog" aria-modal="true" aria-labelledby="mkt-preview-title" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="mkt-modal-close" onClick={() => setPreviewStore(null)} aria-label="Cerrar">×</button>
            {previewStore.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewStore.coverUrl} alt="" className="mkt-modal-cover" />
            )}
            <div className="mkt-modal-body">
              <span>TIENDA DEMO</span>
              <h2 id="mkt-preview-title">{previewStore.name}</h2>
              <p>{previewStore.description}</p>
              <p className="mkt-modal-place"><PinIcon /> {previewStore.deliveryLocation}</p>
              <p className="mkt-modal-help">Esta tienda existe únicamente para previsualizar la interfaz aprobada.</p>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
