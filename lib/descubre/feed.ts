import { featuredPriorityBrand } from "../store/featuredMarketplace";
import type { DiscoverProduct } from "../store/discoverFeed";
import { listingExpiryMs, type ListingRecord } from "./listings";

export interface PersonalDiscoverProduct extends DiscoverProduct {
  personal: true;
  sellerUid: string;
  expiresAt: number;
  linkedStoreId: string | null;
}
export type DiscoverFeedItem = DiscoverProduct | PersonalDiscoverProduct;

export function mergeDiscoverListings(
  storeProducts: readonly DiscoverProduct[],
  listings: readonly ListingRecord[],
  now = Date.now(),
): DiscoverFeedItem[] {
  const personal: PersonalDiscoverProduct[] = listings
    .filter((item) => item.status === "approved" && listingExpiryMs(item) > now)
    .map((item) => ({
      id: item.id,
      storeId: item.linkedStoreId ?? "",
      storeName: item.linkedStoreName ?? item.sellerName,
      storeSlug: item.linkedStoreSlug ?? "",
      storeLogoUrl: item.linkedStoreLogoUrl ?? null,
      deliveryLocation: item.location,
      title: item.title,
      description: item.description,
      imageUrl: item.imageUrl,
      categoryId: item.categoryId,
      priceType: item.priceType,
      priceAmount: item.priceAmount,
      createdAt: new Date(item.createdAt).toISOString(),
      flashEndsAt: item.durationHours <= 48 ? new Date(listingExpiryMs(item)).toISOString() : null,
      expiresAt: listingExpiryMs(item),
      linkedStoreId: item.linkedStoreId,
      sellerUid: item.ownerUid,
      personal: true,
    }));
  const items: DiscoverFeedItem[] = [...storeProducts, ...personal]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id));
  // Preserve the Ke-Rollos/YouTeach first-six guarantee even when newer
  // user-to-user listings arrive. Only already-screened items are here.
  const reserved: DiscoverFeedItem[] = [];
  const seen = new Set<string>();
  for (const brand of ["ke-rollos", "youteach"] as const) {
    const item = items.find((entry) => !("personal" in entry) &&
      featuredPriorityBrand({ id: entry.storeId, name: entry.storeName, slug: entry.storeSlug }) === brand);
    if (item) { reserved.push(item); seen.add(item.id); }
  }
  const rest = items.filter((item) => !seen.has(item.id));
  const initial = rest.slice(0, Math.max(0, 6 - reserved.length));
  for (const item of reserved) {
    const seed = item.id + new Date(now).toISOString().slice(0, 10);
    let hash = 2166136261;
    for (const char of seed) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
    initial.splice((hash >>> 0) % (initial.length + 1), 0, item);
  }
  return [...initial, ...rest.slice(Math.max(0, 6 - reserved.length))].slice(0, 100);
}
