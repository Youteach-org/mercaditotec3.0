export interface DiscoverProduct {
  id: string;
  storeId: string;
  storeName: string;
  storeSlug: string;
  storeLogoUrl: string | null;
  deliveryLocation: string;
  title: string;
  description: string;
  imageUrl: string;
  categoryId: string;
  priceType: "fixed" | "negotiable" | "ask";
  priceAmount: number | null;
  createdAt: string;
  flashEndsAt: string | null;
}

export interface DiscoverSourceProduct {
  id: string;
  storeId: string;
  title: string;
  description: string;
  imageUrls: string[];
  categoryId: string;
  priceType: DiscoverProduct["priceType"];
  priceAmount: number | null;
  createdAt: number;
  updatedAt: number;
  reviewStatus: string;
  approvedVersion?: number | null;
  contentVersion?: number | null;
  flashEndsAt?: string | null;
}

export interface DiscoverSourceStore {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  deliveryLocation: string;
}

export const DISCOVER_LEGACY_CUTOFF_MS = Date.parse("2026-10-16T19:40:00Z");
const MAX_FEED_PRODUCTS = 72;

// Legacy content was already published inside approved stores before Descubre.
// New or subsequently edited products are fail-closed until server-owned,
// version-bound automatic screening is installed and has approved them.
export function isEligibleForDiscover(product: DiscoverSourceProduct): boolean {
  if (!product.imageUrls[0] || !product.storeId || !product.title.trim()) return false;
  if (product.reviewStatus === "approved") {
    return typeof product.approvedVersion === "number"
      && typeof product.contentVersion === "number"
      && product.approvedVersion === product.contentVersion;
  }
  if (product.reviewStatus && product.reviewStatus !== "legacy") return false;
  return product.createdAt > 0
    && product.createdAt < DISCOVER_LEGACY_CUTOFF_MS
    && product.updatedAt > 0
    && product.updatedAt < DISCOVER_LEGACY_CUTOFF_MS;
}

export function buildDiscoverFeed(
  products: readonly DiscoverSourceProduct[],
  stores: readonly DiscoverSourceStore[],
  nowMs = Date.now(),
): DiscoverProduct[] {
  const byStore = new Map(stores.filter((s) => s.id && s.slug).map((s) => [s.id, s]));
  return products
    .filter(isEligibleForDiscover)
    .filter((p) => byStore.has(p.storeId))
    .filter((p) => !p.flashEndsAt || Date.parse(p.flashEndsAt) > nowMs)
    .sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id))
    .slice(0, MAX_FEED_PRODUCTS)
    .map((product) => {
      const store = byStore.get(product.storeId)!;
      return {
        id: product.id,
        storeId: store.id,
        storeName: store.name,
        storeSlug: store.slug,
        storeLogoUrl: store.logoUrl,
        deliveryLocation: store.deliveryLocation,
        title: product.title,
        description: product.description.slice(0, 180),
        imageUrl: product.imageUrls[0],
        categoryId: product.categoryId,
        priceType: product.priceType,
        priceAmount: product.priceAmount,
        createdAt: new Date(product.createdAt).toISOString(),
        flashEndsAt: product.flashEndsAt ?? null,
      };
    });
}
