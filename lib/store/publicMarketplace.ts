import type { MarketplaceVariant, StoreStatus } from "./domain";
import type { ProductPriceType, ProductVisibility } from "./productDomain";
import {
  isStoreOpenNow,
  type StoreOperationalMode,
  type StoreSchedule,
} from "./schedule";

export interface PublicStoreSource {
  id: string;
  ownerUid?: string;
  name: string;
  slug: string | null;
  description: string;
  deliveryLocation: string;
  logoUrl: string | null;
  coverUrl: string | null;
  schedule: StoreSchedule;
  operationalMode: StoreOperationalMode;
  manualOpen: boolean | null;
  marketplaceLabel: string;
  marketplaceNote: string;
  marketplaceTags: string[];
  marketplaceVariant: MarketplaceVariant | null;
}

export interface PublicStoreSummary {
  id: string;
  name: string;
  slug: string;
  description: string;
  deliveryLocation: string;
  logoUrl: string | null;
  coverUrl: string | null;
  schedule: StoreSchedule;
  operationalMode: StoreOperationalMode;
  manualOpen: boolean | null;
  marketplaceLabel: string;
  marketplaceNote: string;
  marketplaceTags: string[];
  marketplaceVariant: MarketplaceVariant | null;
  openNow: boolean;
}

export interface PublicProductSource {
  id: string;
  ownerUid?: string;
  storeId?: string;
  title: string;
  description: string;
  imageUrls: string[];
  categoryId: string;
  suggestedCategoryName: string | null;
  priceType: ProductPriceType;
  priceAmount: number | null;
}

export interface PublicProduct {
  id: string;
  title: string;
  description: string;
  imageUrls: string[];
  categoryId: string;
  suggestedCategoryName: string | null;
  priceType: ProductPriceType;
  priceAmount: number | null;
}

export interface PublicStoreDetail extends PublicStoreSummary {
  products: PublicProduct[];
  whatsappUrl: string | null;
}

export function isPublicStoreStatus(status: StoreStatus): boolean {
  return status === "active";
}

export function isPublicProductVisibility(visibility: ProductVisibility): boolean {
  return visibility === "published";
}

export function serializePublicStore(
  store: PublicStoreSource,
  now = new Date(),
): PublicStoreSummary {
  if (!store.slug) {
    throw new Error("La tienda activa no tiene una URL pública válida.");
  }

  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    description: store.description,
    deliveryLocation: store.deliveryLocation,
    logoUrl: store.logoUrl,
    coverUrl: store.coverUrl,
    schedule: store.schedule,
    operationalMode: store.operationalMode,
    manualOpen: store.manualOpen,
    marketplaceLabel: store.marketplaceLabel,
    marketplaceNote: store.marketplaceNote,
    marketplaceTags: [...store.marketplaceTags],
    marketplaceVariant: store.marketplaceVariant,
    openNow: isStoreOpenNow(
      store.schedule,
      store.operationalMode,
      store.manualOpen,
      now,
      "America/Mexico_City",
    ),
  };
}

export function serializePublicProduct(product: PublicProductSource): PublicProduct {
  return {
    id: product.id,
    title: product.title,
    description: product.description,
    imageUrls: [...product.imageUrls],
    categoryId: product.categoryId,
    suggestedCategoryName: product.suggestedCategoryName,
    priceType: product.priceType,
    priceAmount: product.priceAmount,
  };
}
