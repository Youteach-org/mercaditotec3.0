import { featuredPriorityBrand } from "../store/featuredMarketplace";
import type { DiscoverProduct } from "../store/discoverFeed";
import { type ListingRecord } from "./listings";
import { listingExpiryMs } from "./lifecycle";

export interface PersonalDiscoverProduct extends DiscoverProduct {
  personal: true;
  sellerUid: string;
  expiresAt: number;
  linkedStoreId: string | null;
}
export type DiscoverFeedItem = DiscoverProduct | PersonalDiscoverProduct;

/** Rotate the complete Descubre wall on each visit, preserving the first-nine brand rule. */
export function orderDiscoverProducts<T extends Pick<DiscoverProduct, "id" | "storeId" | "storeName" | "storeSlug"> & { personal?: boolean; featuredBrand?: "ke-rollos" | "youteach" | null }>(items: readonly T[], visitSeed: number): T[] {
  let state = visitSeed >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const shuffle = <U>(source: readonly U[]): U[] => {
    const result = [...source];
    for (let index = result.length - 1; index > 0; index--) {
      const other = Math.floor(random() * (index + 1));
      [result[index], result[other]] = [result[other], result[index]];
    }
    return result;
  };
  const mixed = shuffle(items);
  const reserved: T[] = [];
  for (const brand of ["ke-rollos", "youteach"] as const) {
    const match = mixed.find((item) =>
      !("personal" in item && item.personal) &&
      (item.featuredBrand ?? featuredPriorityBrand({ id: item.storeId, name: item.storeName, slug: item.storeSlug })) === brand,
    );
    if (match) reserved.push(match);
  }
  const excluded = new Set(reserved.map((item) => item.id));
  const ordinary = mixed.filter((item) => !excluded.has(item.id));
  const slots = shuffle(Array.from({ length: Math.min(9, mixed.length) }, (_, i) => i));
  const placements = new Map(reserved.map((item, i) => [slots[i], item]));
  let cursor = 0;
  return Array.from({ length: mixed.length }, (_, i) => placements.get(i) ?? ordinary[cursor++]);
}

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
