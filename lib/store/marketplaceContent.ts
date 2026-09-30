import { getAdminDb, Timestamp } from "../firestoreRest";

export const MARKETPLACE_CATEGORY_IDS = [
  "food",
  "drinks",
  "desserts",
  "crafts",
  "stationery",
  "all",
] as const;

export type MarketplaceCategoryId = (typeof MARKETPLACE_CATEGORY_IDS)[number];

export interface MarketplaceContent {
  heroTitle: string;
  heroEmphasis: string;
  heroSubtitle: string;
  pinkNote: string;
  blueNote: string;
  orangeNote: string;
  campusNote: string;
  studentsNote: string;
  featuredHeading: string;
  bottomBlueNote: string;
  discoverLabel: string;
  futureNote: string;
  searchPlaceholder: string;
  searchButtonLabel: string;
  moreStoresHeading: string;
  categoryLabels: Record<MarketplaceCategoryId, string>;
}

export const DEFAULT_MARKETPLACE_CONTENT: MarketplaceContent = {
  heroTitle: "Tiendas de la",
  heroEmphasis: "comunidad",
  heroSubtitle: "COMIDA · BEBIDAS · ARTESANÍAS\nPAPELERÍA · Y MUCHO MÁS",
  pinkNote: "Apoya\ncompra\ndisfruta\nconecta\n☺",
  blueNote: "PEQUEÑOS\nNEGOCIOS\nGRANDES\nHISTORIAS\n♡",
  orangeNote: "HECHO\nPOR\nESTUDIANTES\nCOMO TÚ\n☺",
  campusNote: "UN CAMPUS\nLLENO DE\nTALENTO ☺",
  studentsNote: "MISMAS\nIDEAS\nMÁS\nCOMUNIDAD",
  featuredHeading: "Tiendas destacadas",
  bottomBlueNote: "MÁS ESTUDIANTES\nMÁS HISTORIAS",
  discoverLabel: "DESCUBRE",
  futureNote: "AQUÍ\nTAMBIÉN SE\nCONSTRUYE\nEL FUTURO\n☺",
  searchPlaceholder: "Busca comida, bebidas, papelería, artesanías...",
  searchButtonLabel: "Buscar",
  moreStoresHeading: "Más tiendas de la comunidad",
  categoryLabels: {
    food: "Comida",
    drinks: "Bebidas",
    desserts: "Postres",
    crafts: "Artesanías",
    stationery: "Papelería",
    all: "Más categorías",
  },
};

function cleanText(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== "string") return fallback;
  const clean = value.replace(/\r\n/g, "\n").trim();
  if (!clean) return fallback;
  return clean.slice(0, maxLength);
}

export function normalizeMarketplaceContent(input: unknown): MarketplaceContent {
  const source = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const labels =
    source.categoryLabels && typeof source.categoryLabels === "object"
      ? source.categoryLabels as Record<string, unknown>
      : {};

  return {
    heroTitle: cleanText(source.heroTitle, DEFAULT_MARKETPLACE_CONTENT.heroTitle, 50),
    heroEmphasis: cleanText(source.heroEmphasis, DEFAULT_MARKETPLACE_CONTENT.heroEmphasis, 50),
    heroSubtitle: cleanText(source.heroSubtitle, DEFAULT_MARKETPLACE_CONTENT.heroSubtitle, 120),
    pinkNote: cleanText(source.pinkNote, DEFAULT_MARKETPLACE_CONTENT.pinkNote, 100),
    blueNote: cleanText(source.blueNote, DEFAULT_MARKETPLACE_CONTENT.blueNote, 100),
    orangeNote: cleanText(source.orangeNote, DEFAULT_MARKETPLACE_CONTENT.orangeNote, 100),
    campusNote: cleanText(source.campusNote, DEFAULT_MARKETPLACE_CONTENT.campusNote, 100),
    studentsNote: cleanText(source.studentsNote, DEFAULT_MARKETPLACE_CONTENT.studentsNote, 100),
    featuredHeading: cleanText(source.featuredHeading, DEFAULT_MARKETPLACE_CONTENT.featuredHeading, 60),
    bottomBlueNote: cleanText(source.bottomBlueNote, DEFAULT_MARKETPLACE_CONTENT.bottomBlueNote, 100),
    discoverLabel: cleanText(source.discoverLabel, DEFAULT_MARKETPLACE_CONTENT.discoverLabel, 30),
    futureNote: cleanText(source.futureNote, DEFAULT_MARKETPLACE_CONTENT.futureNote, 100),
    searchPlaceholder: cleanText(source.searchPlaceholder, DEFAULT_MARKETPLACE_CONTENT.searchPlaceholder, 100),
    searchButtonLabel: cleanText(source.searchButtonLabel, DEFAULT_MARKETPLACE_CONTENT.searchButtonLabel, 30),
    moreStoresHeading: cleanText(source.moreStoresHeading, DEFAULT_MARKETPLACE_CONTENT.moreStoresHeading, 70),
    categoryLabels: {
      food: cleanText(labels.food, DEFAULT_MARKETPLACE_CONTENT.categoryLabels.food, 30),
      drinks: cleanText(labels.drinks, DEFAULT_MARKETPLACE_CONTENT.categoryLabels.drinks, 30),
      desserts: cleanText(labels.desserts, DEFAULT_MARKETPLACE_CONTENT.categoryLabels.desserts, 30),
      crafts: cleanText(labels.crafts, DEFAULT_MARKETPLACE_CONTENT.categoryLabels.crafts, 30),
      stationery: cleanText(labels.stationery, DEFAULT_MARKETPLACE_CONTENT.categoryLabels.stationery, 30),
      all: cleanText(labels.all, DEFAULT_MARKETPLACE_CONTENT.categoryLabels.all, 30),
    },
  };
}

const CONTENT_DOC = "site_config/marketplace";

export async function getMarketplaceContent(): Promise<MarketplaceContent> {
  const snapshot = await getAdminDb().collection("site_config").doc("marketplace").get();
  return normalizeMarketplaceContent(snapshot.data());
}

export async function saveMarketplaceContent(input: unknown): Promise<MarketplaceContent> {
  const content = normalizeMarketplaceContent(input);
  await getAdminDb().collection("site_config").doc("marketplace").set(
    {
      ...content,
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );
  return content;
}
