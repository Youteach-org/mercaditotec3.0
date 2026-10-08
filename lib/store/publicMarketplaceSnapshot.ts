import { FirestoreRestError } from "../firestoreRest";
import { DEMO_MARKETPLACE_STORES } from "./demoMarketplace";
import { getMarketplaceContent } from "./marketplaceContentRepository";
import { listPublicStores } from "./publicMarketplaceRepository";
import { listActiveCategories, serializeCategory } from "./categoryRepository";

// Public data may be slightly delayed; privileged data and authorization
// checks never use this cache.
const FRESH_FOR_MS = 5 * 60_000;
const STALE_ON_THROTTLE_FOR_MS = 15 * 60_000;
const BACKOFF_ON_THROTTLE_MS = 60_000;
let throttleUntil = 0;

async function readSnapshot() {
  const startedAt = Date.now();
  // Deduplicate the categories query across the store/category serializers.
  const observe = async <T>(query: "categories" | "site_config", promise: Promise<T>): Promise<T> => {
    try {
      return await promise;
    } catch (error) {
      if (error instanceof FirestoreRestError) {
        console.error("PUBLIC_MARKETPLACE_QUERY_FAILURE", {
          query,
          httpStatus: error.status,
          message: error.message.slice(0, 250),
        });
      }
      throw error;
    }
  };
  const categoriesRequest = observe("categories", listActiveCategories());
  const [liveStores, content, categories] = await Promise.all([
    listPublicStores(categoriesRequest),
    observe("site_config", getMarketplaceContent()),
    categoriesRequest,
  ]);
  console.info("PUBLIC_MARKETPLACE_SNAPSHOT_REFRESHED", {
    durationMs: Date.now() - startedAt,
    realStores: liveStores.length,
    categories: categories.length,
  });

  const temporaryExamples = DEMO_MARKETPLACE_STORES
    .filter((demoStore) => !liveStores.some((store) => store.id === demoStore.id))
;

  const stores = [...liveStores, ...temporaryExamples];
  return {
    stores,
    content,
    categories: categories.map(serializeCategory),
    temporaryExamplesEnabled: true,
    realStoreCount: liveStores.length,
    exampleStoreCount: temporaryExamples.length,
    totalStoreCount: stores.length,
  };
}

type Snapshot = Awaited<ReturnType<typeof readSnapshot>>;
let cached: { snapshot: Snapshot; createdAt: number } | null = null;
let pending: Promise<Snapshot> | null = null;

export async function getPublicMarketplaceSnapshot(): Promise<Snapshot> {
  const now = Date.now();
  if (cached && now - cached.createdAt < FRESH_FOR_MS) return cached.snapshot;
  if (pending) return pending;
  if (now < throttleUntil && cached && now - cached.createdAt < STALE_ON_THROTTLE_FOR_MS) {
    return cached.snapshot;
  }

  const work: Promise<Snapshot> = readSnapshot()
    .then((snapshot) => {
      cached = { snapshot, createdAt: Date.now() };
      throttleUntil = 0;
      return snapshot;
    })
    .catch((error: unknown) => {
      if (error instanceof FirestoreRestError && error.status === 429) {
        throttleUntil = Date.now() + BACKOFF_ON_THROTTLE_MS;
        console.error("PUBLIC_MARKETPLACE_FIRESTORE_QUOTA", JSON.stringify({status: error.status, message: error.message.slice(0, 300)}));
      }
      // Only tolerate a short-lived stale *public* snapshot under provider
      // saturation. Do not invent stores, reveal private data or bypass auth.
      if (
        error instanceof FirestoreRestError &&
        error.status === 429 &&
        cached &&
        Date.now() - cached.createdAt < STALE_ON_THROTTLE_FOR_MS
      ) {
        return cached.snapshot;
      }
      throw error;
    })
    .finally(() => {
      if (pending === work) pending = null;
    });

  pending = work;
  return work;
}
