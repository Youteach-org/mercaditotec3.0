import { getAdminDb } from "../firestoreRest";

/** Mark the shared Descubre/Tiendas snapshot stale after a public catalogue mutation. */
export async function markPublicMarketplaceChanged(): Promise<void> {
  await getAdminDb().collection("public_marketplace_cache").doc("catalog-v3")
    .set({ revision: crypto.randomUUID() }, { merge: true });
}
