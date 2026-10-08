import { FirestoreRestError, Timestamp, getAdminDb } from "../firestoreRest";
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

// An immutable, public-only materialization in Firestore. Unlike a per-isolate
// memory cache, all Cloudflare locations can read the same prepared catalogue.
// Mutation-triggered rebuilds keep it current; a slow safety refresh covers
// updates made directly in Firebase outside of Mercadito's APIs.
const SNAPSHOT_COLLECTION = "public_marketplace_cache";
const SNAPSHOT_ID = "catalog-v1";
const SAFETY_REFRESH_MS = 24 * 60 * 60 * 1000;
const MAX_STALE_ON_OUTAGE_MS = 48 * 60 * 60 * 1000;
const MAX_DOCUMENT_BYTES = 700_000;

function materializedReference() {
  return getAdminDb().collection(SNAPSHOT_COLLECTION).doc(SNAPSHOT_ID);
}

function isPublicSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    Array.isArray(record.stores) &&
    Array.isArray(record.categories) &&
    record.content !== null &&
    typeof record.content === "object" &&
    typeof record.totalStoreCount === "number"
  );
}

async function readMaterialized(): Promise<{ snapshot: Snapshot; ageMs: number } | null> {
  const doc = await materializedReference().get();
  if (!doc.exists) return null;
  const data = doc.data();
  const stamp = data?.generatedAt;
  const snapshot = data?.snapshot;
  if (!(stamp instanceof Timestamp) || !isPublicSnapshot(snapshot)) return null;
  return { snapshot, ageMs: Math.max(0, Date.now() - stamp.toMillis()) };
}

/**
 * Called in the background after successful public-catalogue mutations.
 * Rebuilds once per real change, not on every public page request.
 * If persistence is temporarily unavailable, an existing published snapshot
 * remains intact; a later mutation or the safety refresh will retry.
 */
export async function rebuildPublicMarketplaceSnapshot(): Promise<Snapshot> {
  const result = await readSnapshot();
  const bytes = new TextEncoder().encode(JSON.stringify(result)).length;
  if (bytes > MAX_DOCUMENT_BYTES) {
    console.error("PUBLIC_MARKETPLACE_MATERIALIZATION_TOO_LARGE", { bytes });
    throw new Error("El catálogo público supera el tamaño seguro de un documento.");
  }
  await materializedReference().set({ snapshot: result, generatedAt: Timestamp.now() });
  cached = { snapshot: result, createdAt: Date.now() };
  throttleUntil = 0;
  console.info("PUBLIC_MARKETPLACE_MATERIALIZED", {
    bytes,
    stores: result.realStoreCount,
    total: result.totalStoreCount,
  });
  return result;
}

let cached: { snapshot: Snapshot; createdAt: number } | null = null;
let pending: Promise<Snapshot> | null = null;

export async function getPublicMarketplaceSnapshot(): Promise<Snapshot> {
  const now = Date.now();
  if (cached && now - cached.createdAt < FRESH_FOR_MS) return cached.snapshot;
  if (pending) return pending;
  if (now < throttleUntil && cached && now - cached.createdAt < STALE_ON_THROTTLE_FOR_MS) {
    return cached.snapshot;
  }

  const work: Promise<Snapshot> = (async () => {
    const stored = await readMaterialized();
    if (stored && stored.ageMs < SAFETY_REFRESH_MS) {
      console.info("PUBLIC_MARKETPLACE_MATERIALIZED_HIT", { ageMinutes: Math.round(stored.ageMs / 60_000) });
      return stored.snapshot;
    }

    try {
      return await rebuildPublicMarketplaceSnapshot();
    } catch (error) {
      if (stored && stored.ageMs < MAX_STALE_ON_OUTAGE_MS) {
        console.warn("PUBLIC_MARKETPLACE_STALE_MATERIALIZATION", {
          ageMinutes: Math.round(stored.ageMs / 60_000),
          error: error instanceof Error ? error.name : "UnknownError",
        });
        return stored.snapshot;
      }
      throw error;
    }
  })()
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
