import { getAdminDb, Timestamp } from "../firestoreRest";
import {
  normalizeMarketplaceContent,
  type MarketplaceContent,
} from "./marketplaceContent";

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
