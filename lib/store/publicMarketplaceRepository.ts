import { FirestoreRestError, getAdminDb } from "../firestoreRest";
import { buildDiscoverFeed, isEligibleForDiscover, type DiscoverProduct, type DiscoverSourceProduct } from "./discoverFeed";
import { isApprovedStoreProduct } from "./productReview";
import { featuredPriorityBrand } from "./featuredMarketplace";
import { whatsappUrlFromNumber } from "../security/whatsapp";
import { normalizeStoredSchedule } from "./schedule";
import { readStoreRatingStats } from "./storeRating";
import { listActiveCategories } from "./categoryRepository";
import {
  serializePublicProduct,
  serializePublicStore,
  type PublicProduct,
  type PublicProductSource,
  type PublicStoreDetail,
  type PublicStoreSource,
  type PublicStoreSummary,
} from "./publicMarketplace";

// Log only query names and statuses; never log profile data or Firestore documents.
async function observePublicQuery<T>(name: "stores" | "products", request: Promise<T>): Promise<T> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof FirestoreRestError) {
      console.error("PUBLIC_MARKETPLACE_QUERY_FAILURE", {
        query: name,
        httpStatus: error.status,
        message: error.message.slice(0, 250),
      });
    }
    throw error;
  }
}

export class PublicMarketplaceError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

function storeSource(id: string, data: Record<string, unknown>): PublicStoreSource {
  return {
    id,
    ownerUid: typeof data.ownerUid === "string" ? data.ownerUid : "",
    ratingStats: readStoreRatingStats(data.ratingStats),
    name: typeof data.name === "string" ? data.name : "",
    slug: typeof data.slug === "string" && data.slug.trim() ? data.slug : null,
    description: typeof data.description === "string" ? data.description : "",
    deliveryLocation:
      typeof data.deliveryLocation === "string" ? data.deliveryLocation : "",
    logoUrl: typeof data.logoUrl === "string" ? data.logoUrl : null,
    coverUrl: typeof data.coverUrl === "string" ? data.coverUrl : null,
    schedule: normalizeStoredSchedule(data.schedule),
    operationalMode: data.operationalMode === "manual" ? "manual" : "automatic",
    manualOpen: typeof data.manualOpen === "boolean" ? data.manualOpen : null,
    marketplaceLabel: typeof data.marketplaceLabel === "string" ? data.marketplaceLabel : "",
    marketplaceNote: typeof data.marketplaceNote === "string" ? data.marketplaceNote : "",
    marketplaceTags: Array.isArray(data.marketplaceTags)
      ? data.marketplaceTags.filter((value): value is string => typeof value === "string")
      : [],
    marketplaceVariant:
      data.marketplaceVariant === "cloud-1" ||
      data.marketplaceVariant === "cloud-2" ||
      data.marketplaceVariant === "cloud-3" ||
      data.marketplaceVariant === "cloud-4" ||
      data.marketplaceVariant === "cloud-5" ||
      data.marketplaceVariant === "cloud-6"
        ? data.marketplaceVariant
        : null,
    categoryIds: [],
  };
}

function productSource(id: string, data: Record<string, unknown>): PublicProductSource {
  return {
    id,
    ownerUid: typeof data.ownerUid === "string" ? data.ownerUid : "",
    storeId: typeof data.storeId === "string" ? data.storeId : "",
    title: typeof data.title === "string" ? data.title : "",
    description: typeof data.description === "string" ? data.description : "",
    imageUrls: Array.isArray(data.imageUrls)
      ? data.imageUrls.filter((value): value is string => typeof value === "string")
      : [],
    categoryId: typeof data.categoryId === "string" ? data.categoryId : "",
    suggestedCategoryName:
      typeof data.suggestedCategoryName === "string" && data.suggestedCategoryName.trim()
        ? data.suggestedCategoryName.trim()
        : null,
    priceType:
      data.priceType === "negotiable" || data.priceType === "ask"
        ? data.priceType
        : "fixed",
    priceAmount: typeof data.priceAmount === "number" ? data.priceAmount : null,
  };
}

export async function listPublicStores(
  activeCategoriesRequest?: ReturnType<typeof listActiveCategories>,
  onDiscoverProducts?: (products: DiscoverProduct[]) => void,
): Promise<PublicStoreSummary[]> {
  const db = getAdminDb();
  const [storeSnapshot, productSnapshot, activeCategories] = await Promise.all([
    observePublicQuery("stores", db.collection("stores")
      .where("status", "==", "active")
      .limit(50)
      .get()),
    observePublicQuery("products", db.collection("products")
      .where("visibility", "==", "published")
      .limit(300)
      .get()),
    activeCategoriesRequest ?? listActiveCategories(),
  ]);

  console.info("PUBLIC_MARKETPLACE_QUERY_COUNTS", {
    storesRead: storeSnapshot.docs.length,
    productsRead: productSnapshot.docs.length,
    activeCategories: activeCategories.length,
  });

  const activeCategoryIds = new Set(activeCategories.map((category) => category.id));
  const categoriesByStore = new Map<string, Set<string>>();

  for (const document of productSnapshot.docs) {
    const data = document.data();
    const storeId = typeof data.storeId === "string" ? data.storeId : "";
    const categoryId = typeof data.categoryId === "string" ? data.categoryId : "";
    if (!storeId || !categoryId || !activeCategoryIds.has(categoryId)) continue;

    const categories = categoriesByStore.get(storeId) ?? new Set<string>();
    categories.add(categoryId);
    categoriesByStore.set(storeId, categories);
  }

  // Reuse the bounded products query used for store categories. Only when a
  // reserved brand is missing may the daily shared snapshot need one small
  // additional lookup for that brand (never one lookup per visitor).
  const activeStores = storeSnapshot.docs
    .filter((document) => document.data().status === "active")
    .map((document) => ({
      id: document.id,
      name: String(document.data().name ?? ""),
      slug: String(document.data().slug ?? ""),
      logoUrl: typeof document.data().logoUrl === "string" ? document.data().logoUrl as string : null,
      deliveryLocation: String(document.data().deliveryLocation ?? ""),
    }));
  if (onDiscoverProducts) {
    const toMs = (value: unknown): number => {
      if (value && typeof value === "object" && "toMillis" in value) {
        const read = (value as { toMillis?: () => number }).toMillis;
        if (typeof read === "function") return read.call(value);
      }
      return 0;
    };
    const candidateFromDocument = (document: (typeof productSnapshot.docs)[number]): DiscoverSourceProduct => {
      const data = document.data();
      return {
        id: document.id,
        storeId: String(data.storeId ?? ""),
        title: String(data.title ?? ""),
        description: String(data.description ?? ""),
        imageUrls: Array.isArray(data.imageUrls)
          ? data.imageUrls.filter((url: unknown): url is string => typeof url === "string")
          : [],
        categoryId: String(data.categoryId ?? ""),
        priceType: data.priceType === "ask" || data.priceType === "negotiable" ? data.priceType : "fixed",
        priceAmount: typeof data.priceAmount === "number" ? data.priceAmount : null,
        createdAt: toMs(data.createdAt),
        updatedAt: toMs(data.updatedAt),
        reviewStatus: typeof data.reviewStatus === "string" ? data.reviewStatus : "legacy",
        approvedVersion: typeof data.approvedVersion === "number" ? data.approvedVersion : null,
        contentVersion: typeof data.contentVersion === "number" ? data.contentVersion : null,
        flashEndsAt: typeof data.flashEndsAt === "string" ? data.flashEndsAt : null,
      };
    };
    const candidates: DiscoverSourceProduct[] = productSnapshot.docs.map(candidateFromDocument);

    const reservedBrands = new Set<string>();
    for (const store of activeStores) {
      const brand = featuredPriorityBrand(store);
      if (!brand || reservedBrands.has(brand)) continue;
      reservedBrands.add(brand);
      if (candidates.some((candidate) => candidate.storeId === store.id && isEligibleForDiscover(candidate))) continue;
      // One targeted query only if that brand was absent from the common
      // 300-item snapshot: avoids silently losing Ke-Rollos as catalog grows.
      const fallback = await observePublicQuery("products",
        db.collection("products").where("storeId", "==", store.id).limit(40).get());
      for (const doc of fallback.docs) {
        if (doc.data().visibility !== "published") continue;
        const candidate = candidateFromDocument(doc);
        if (isEligibleForDiscover(candidate) && !candidates.some((item) => item.id === candidate.id)) {
          candidates.push(candidate);
        }
      }
    }
    onDiscoverProducts(buildDiscoverFeed(candidates, activeStores));
  }

  return storeSnapshot.docs
    .map((document) => {
      const store = storeSource(document.id, document.data());
      store.categoryIds = [...(categoriesByStore.get(document.id) ?? new Set<string>())];
      return store;
    })
    .filter((store) => Boolean(store.slug))
    .map((store) => serializePublicStore(store))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

async function getPublicStoreSourceBySlug(slug: string): Promise<PublicStoreSource> {
  const cleanSlug = slug.trim();
  if (!cleanSlug) throw new PublicMarketplaceError(404, "Tienda no encontrada.");

  const snapshot = await getAdminDb()
    .collection("stores")
    .where("slug", "==", cleanSlug)
    .limit(1)
    .get();

  if (snapshot.empty) throw new PublicMarketplaceError(404, "Tienda no encontrada.");
  const document = snapshot.docs[0];
  const data = document.data();
  if (data.status !== "active") {
    throw new PublicMarketplaceError(404, "Tienda no encontrada.");
  }

  return storeSource(document.id, data);
}

export async function getPublicStoreBySlug(slug: string): Promise<PublicStoreSummary> {
  return serializePublicStore(await getPublicStoreSourceBySlug(slug));
}

async function getPublicWhatsappUrl(ownerUid: string | undefined): Promise<string | null> {
  if (!ownerUid) return null;

  const snapshot = await getAdminDb().collection("users").doc(ownerUid).get();
  if (!snapshot.exists) return null;

  const data = snapshot.data();
  const number = typeof data?.whatsappNumber === "string" ? data.whatsappNumber : "";
  return whatsappUrlFromNumber(number);
}

export async function listPublicProducts(storeId: string): Promise<PublicProduct[]> {
  const snapshot = await getAdminDb()
    .collection("products")
    .where("storeId", "==", storeId)
    .limit(100)
    .get();

  return snapshot.docs
    .filter((document) => {
      const data = document.data();
      const toMs = (stamp: unknown): number => stamp && typeof stamp === "object" && "toMillis" in stamp && typeof stamp.toMillis === "function" ? stamp.toMillis() : 0;
      return isApprovedStoreProduct({
        visibility: String(data.visibility ?? ""), reviewStatus: typeof data.reviewStatus === "string" ? data.reviewStatus : "legacy",
        contentVersion: typeof data.contentVersion === "number" ? data.contentVersion : null,
        approvedVersion: typeof data.approvedVersion === "number" ? data.approvedVersion : null,
        createdAt: toMs(data.createdAt), updatedAt: toMs(data.updatedAt),
      });
    })
    .map((document) => serializePublicProduct(productSource(document.id, document.data())))
    .sort((a, b) => a.title.localeCompare(b.title, "es"));
}

export async function getPublicStoreDetail(slug: string): Promise<PublicStoreDetail> {
  const source = await getPublicStoreSourceBySlug(slug);
  const store = serializePublicStore(source);
  const [products, whatsappUrl] = await Promise.all([
    listPublicProducts(store.id),
    getPublicWhatsappUrl(source.ownerUid),
  ]);
  return { ...store, products, whatsappUrl };
}
