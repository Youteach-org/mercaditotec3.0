import { getAdminDb } from "../firebaseAdmin";
import { normalizeStoredSchedule } from "./schedule";
import {
  isPublicProductVisibility,
  serializePublicProduct,
  serializePublicStore,
  type PublicProduct,
  type PublicStoreDetail,
  type PublicStoreSummary,
} from "./publicMarketplace";

export class PublicMarketplaceError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

function storeSource(id: string, data: Record<string, unknown>) {
  return {
    id,
    ownerUid: typeof data.ownerUid === "string" ? data.ownerUid : "",
    name: typeof data.name === "string" ? data.name : "",
    slug: typeof data.slug === "string" && data.slug.trim() ? data.slug : null,
    description: typeof data.description === "string" ? data.description : "",
    deliveryLocation:
      typeof data.deliveryLocation === "string" ? data.deliveryLocation : "",
    logoUrl: typeof data.logoUrl === "string" ? data.logoUrl : null,
    coverUrl: typeof data.coverUrl === "string" ? data.coverUrl : null,
    schedule: normalizeStoredSchedule(data.schedule),
    operationalMode: data.operationalMode === "manual" ? "manual" as const : "automatic" as const,
    manualOpen: typeof data.manualOpen === "boolean" ? data.manualOpen : null,
  };
}

function productSource(id: string, data: Record<string, unknown>) {
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
        : "fixed" as const,
    priceAmount: typeof data.priceAmount === "number" ? data.priceAmount : null,
  };
}

export async function listPublicStores(): Promise<PublicStoreSummary[]> {
  const snapshot = await getAdminDb()
    .collection("stores")
    .where("status", "==", "active")
    .limit(100)
    .get();

  return snapshot.docs
    .map((document) => storeSource(document.id, document.data()))
    .filter((store) => Boolean(store.slug))
    .map((store) => serializePublicStore(store))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export async function getPublicStoreBySlug(slug: string): Promise<PublicStoreSummary> {
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

  return serializePublicStore(storeSource(document.id, data));
}

export async function listPublicProducts(storeId: string): Promise<PublicProduct[]> {
  const snapshot = await getAdminDb()
    .collection("products")
    .where("storeId", "==", storeId)
    .limit(100)
    .get();

  return snapshot.docs
    .filter((document) => isPublicProductVisibility(document.data().visibility))
    .map((document) => serializePublicProduct(productSource(document.id, document.data())))
    .sort((a, b) => a.title.localeCompare(b.title, "es"));
}

export async function getPublicStoreDetail(slug: string): Promise<PublicStoreDetail> {
  const store = await getPublicStoreBySlug(slug);
  const products = await listPublicProducts(store.id);
  return { ...store, products };
}
