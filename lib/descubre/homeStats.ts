import type { DiscoverFeedItem } from "./feed";
import type { PublicDiscoverPreview } from "./publicPreview";

/**
 * Count the products currently available in the same Descubre feed already
 * sent to the signed-in browser. Storefront products and approved individual
 * ads count; expired individual ads do not. No Firestore reads.
 *
 * This is the number of discoverable entries in the bounded wall, not a
 * claim about every product ever stored in Firebase.
 */
export function countDiscoverProducts(items: readonly (DiscoverFeedItem | PublicDiscoverPreview)[], now = Date.now()): number {
  return items.filter((item) =>
    !("personal" in item && item.personal) || item.expiresAt > now,
  ).length;
}
