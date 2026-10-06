import { getAdminDb, Timestamp } from "../firestoreRest";
import {
  normalizeMarketplaceContent,
  type MarketplaceContent,
} from "./marketplaceContent";
import { listActiveCategories } from "./categoryRepository";

export async function getMarketplaceContent(): Promise<MarketplaceContent> {
  const snapshot = await getAdminDb().collection("site_config").doc("marketplace").get();
  return normalizeMarketplaceContent(snapshot.data());
}

export async function saveMarketplaceContent(input: unknown): Promise<MarketplaceContent> {
  const content = normalizeMarketplaceContent(input);
  const activeCategories = await listActiveCategories();
  const activeIds = new Set(activeCategories.map((category) => category.id));
  content.marketplaceCategoryIds = content.marketplaceCategoryIds
    .filter((categoryId) => activeIds.has(categoryId))
    .slice(0, 5);

  await getAdminDb().collection("site_config").doc("marketplace").set(
    {
      ...content,
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );
  return content;
}
