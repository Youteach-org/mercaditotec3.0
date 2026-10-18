import type { DiscoverProduct } from "../store/discoverFeed";
import type { DiscoverFeedItem } from "./feed";

/** Public previews deliberately exclude the seller, store, delivery and personal details. */
export type PublicDiscoverPreview = Pick<DiscoverProduct,
  "id" | "title" | "imageUrl" | "categoryId" | "priceType" | "priceAmount" |
  "createdAt" | "flashEndsAt"
> & {
  description: string;
  storeName: string;
  storeId: string;
  storeSlug: string;
  storeLogoUrl: null;
  deliveryLocation: string;
} & ({ personal: true; expiresAt: number } | { personal?: false });

export function publicDiscoverPreview(items: readonly DiscoverFeedItem[]): PublicDiscoverPreview[] {
  return items.map((product) => ({
    id: product.id,
    title: product.title,
    imageUrl: product.imageUrl,
    categoryId: product.categoryId,
    priceType: product.priceType,
    priceAmount: product.priceAmount,
    createdAt: product.createdAt,
    flashEndsAt: product.flashEndsAt,
    description: "",
    storeName: "",
    storeId: "",
    storeSlug: "",
    storeLogoUrl: null,
    deliveryLocation: "",
    ...("personal" in product && product.personal
      ? { personal: true as const, expiresAt: product.expiresAt }
      : {}),
  }));
}
