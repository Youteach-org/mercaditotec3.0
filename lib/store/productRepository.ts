import { Timestamp, type DocumentData } from "../firestoreRest";

import { getAdminDb } from "../firestoreRest";
import { canOwnerEditStore, type StoreStatus } from "./domain";
import { coerceRecordTimestamp } from "./legacyTimestamp";
import {
  getStoreForOwner,
  type StoreRuleRecord,
} from "./repository";
import { requireActiveCategory, normalizeCategoryName } from "./categoryRepository";
import { promoteSuggestedCategory } from "./defaultCategories";
import { assertProductImageUrlsForStore } from "./media";
import { markPublicMarketplaceChanged } from "./publicMarketplaceRevision";
import { nextProductReview, needsLegacyProductReview, type StoreProductReviewStatus } from "./productReview";
import {
  validateProductInput,
  type ProductEditableInput,
  type ProductPriceType,
  type ProductVisibility,
} from "./productDomain";

export interface ProductOwnershipRecord {
  id: string;
  ownerUid: string;
  storeId: string;
}

export interface ProductRecord extends ProductOwnershipRecord {
  title: string;
  description: string;
  imageUrls: string[];
  categoryId: string;
  suggestedCategoryName: string | null;
  priceType: ProductPriceType;
  priceAmount: number | null;
  visibility: ProductVisibility;
  reviewStatus: StoreProductReviewStatus;
  reviewReason: string | null;
  contentVersion: number;
  approvedVersion: number | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class ProductRepositoryError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function assertStoreAllowsProductEditing(store: { status: StoreStatus }): void {
  if (!canOwnerEditStore(store.status)) {
    throw new ProductRepositoryError(
      409,
      "La tienda está en revisión y sus productos no pueden modificarse.",
    );
  }
}

export function assertInitialProductCreationAllowed(
  status: StoreStatus,
  existingProductCount: number,
): void {
  if (
    (status === "draft" || status === "changes_required") &&
    existingProductCount >= 1
  ) {
    throw new ProductRepositoryError(
      409,
      "Antes de aprobar tu tienda solo puedes registrar un producto inicial.",
    );
  }
}

export function assertProductOwnership(
  ownerUid: string,
  storeId: string,
  product: ProductOwnershipRecord,
): void {
  if (product.ownerUid !== ownerUid || product.storeId !== storeId) {
    throw new ProductRepositoryError(404, "Producto no encontrado.");
  }
}

export function buildNewProductRecord(
  ownerUid: string,
  storeId: string,
  productId: string,
  input: ProductEditableInput,
) {
  const validated = validateProductInput(input);
  return {
    id: productId,
    ownerUid,
    storeId,
    ...validated,
    suggestedCategoryName: validated.suggestedCategoryName ?? null,
  };
}

function toProductRecord(id: string, data: DocumentData): ProductRecord {
  return {
    id,
    ownerUid: String(data.ownerUid ?? ""),
    storeId: String(data.storeId ?? ""),
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    imageUrls: Array.isArray(data.imageUrls)
      ? data.imageUrls.filter((value: unknown): value is string => typeof value === "string")
      : [],
    categoryId: String(data.categoryId ?? ""),
    suggestedCategoryName:
      typeof data.suggestedCategoryName === "string" && data.suggestedCategoryName.trim()
        ? data.suggestedCategoryName.trim()
        : null,
    priceType: data.priceType as ProductPriceType,
    priceAmount: typeof data.priceAmount === "number" ? data.priceAmount : null,
    visibility: data.visibility as ProductVisibility,
    reviewStatus: typeof data.reviewStatus === "string" ? data.reviewStatus as StoreProductReviewStatus : "legacy",
    reviewReason: typeof data.reviewReason === "string" ? data.reviewReason : null,
    contentVersion: typeof data.contentVersion === "number" ? data.contentVersion : 0,
    approvedVersion: typeof data.approvedVersion === "number" ? data.approvedVersion : null,
    createdAt: coerceRecordTimestamp(data.createdAt),
    updatedAt: coerceRecordTimestamp(data.updatedAt, coerceRecordTimestamp(data.createdAt)),
  };
}

async function getEditableStore(ownerUid: string, storeId: string): Promise<StoreRuleRecord> {
  const store = await getStoreForOwner(ownerUid, storeId);
  assertStoreAllowsProductEditing(store);
  return store;
}

export async function createProduct(
  ownerUid: string,
  storeId: string,
  input: ProductEditableInput,
): Promise<ProductRecord> {
  const store = await getEditableStore(ownerUid, storeId);
  const db = getAdminDb();

  if (store.status === "draft" || store.status === "changes_required") {
    const existing = await db
      .collection("products")
      .where("storeId", "==", storeId)
      .limit(1)
      .get();
    assertInitialProductCreationAllowed(store.status, existing.size);
  }

  const reference = db.collection("products").doc();
  const base = buildNewProductRecord(ownerUid, storeId, reference.id, input);

  assertProductImageUrlsForStore(base.imageUrls, ownerUid, storeId, reference.id);
  if (base.visibility === "published" && base.categoryId) {
    await requireActiveCategory(base.categoryId);
  }

  const now = Timestamp.now();
  const product: ProductRecord = { ...base, ...nextProductReview(base.visibility), createdAt: now, updatedAt: now };
  await reference.set(product);
  if (store.status === "active") await markPublicMarketplaceChanged();
  return product;
}

export async function listProductsForOwner(
  ownerUid: string,
  storeId: string,
): Promise<ProductRecord[]> {
  await getStoreForOwner(ownerUid, storeId);
  const snapshot = await getAdminDb()
    .collection("products")
    .where("storeId", "==", storeId)
    .get();

  return snapshot.docs
    .map((document) => toProductRecord(document.id, document.data()))
    .filter((product) => product.ownerUid === ownerUid)
    .sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis());
}

async function getProductForOwner(
  ownerUid: string,
  storeId: string,
  productId: string,
): Promise<ProductRecord> {
  const snapshot = await getAdminDb().collection("products").doc(productId).get();
  if (!snapshot.exists) throw new ProductRepositoryError(404, "Producto no encontrado.");

  const product = toProductRecord(snapshot.id, snapshot.data()!);
  assertProductOwnership(ownerUid, storeId, product);
  return product;
}

export async function updateProduct(
  ownerUid: string,
  storeId: string,
  productId: string,
  input: ProductEditableInput,
): Promise<ProductRecord> {
  await getEditableStore(ownerUid, storeId);
  const current = await getProductForOwner(ownerUid, storeId, productId);
  const validated = validateProductInput(input);
  const suggestedCategoryName = validated.suggestedCategoryName ?? null;

  assertProductImageUrlsForStore(validated.imageUrls, ownerUid, storeId, productId);
  if (validated.visibility === "published" && validated.categoryId) {
    await requireActiveCategory(validated.categoryId);
  }

  const now = Timestamp.now();
  const next: ProductRecord = {
    ...current,
    ...validated,
    suggestedCategoryName,
    updatedAt: now,
    ...nextProductReview(validated.visibility, current.contentVersion),
  };

  await getAdminDb().collection("products").doc(productId).update({
    title: next.title,
    description: next.description,
    imageUrls: next.imageUrls,
    categoryId: next.categoryId,
    suggestedCategoryName: next.suggestedCategoryName,
    priceType: next.priceType,
    priceAmount: next.priceAmount,
    visibility: next.visibility,
    reviewStatus: next.reviewStatus,
    reviewReason: next.reviewReason,
    contentVersion: next.contentVersion,
    approvedVersion: next.approvedVersion,
    updatedAt: now,
  });

  await markPublicMarketplaceChanged();

  return next;
}

export async function deleteProduct(
  ownerUid: string,
  storeId: string,
  productId: string,
): Promise<void> {
  await getEditableStore(ownerUid, storeId);
  await getProductForOwner(ownerUid, storeId, productId);
  await getAdminDb().collection("products").doc(productId).delete();
  await markPublicMarketplaceChanged();
}

/** Trusted edge-only result, bound to the exact content version being scanned. */
export async function finishProductScreening(
  productId: string,
  contentVersion: number,
  decision: "approved" | "blocked" | "needs_changes" | "manual_review",
  reason: string,
): Promise<{ ownerUid: string; storeId: string; title: string; status: string }> {
  const db = getAdminDb();
  const ref = db.collection("products").doc(productId);
  let result: { ownerUid: string; storeId: string; title: string; status: string } | null = null;
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new ProductRepositoryError(404, "Producto no encontrado.");
    const data = snapshot.data()!;
    if (data.reviewStatus !== "screening" || data.contentVersion !== contentVersion) {
      throw new ProductRepositoryError(409, "El producto cambió durante su revisión.");
    }
    transaction.update(ref, {
      reviewStatus: decision,
      reviewReason: decision === "approved" ? null : reason.slice(0, 180),
      approvedVersion: decision === "approved" ? contentVersion : null,
      screenedAt: Timestamp.now(),
    });
    result = { ownerUid: String(data.ownerUid ?? ""), storeId: String(data.storeId ?? ""),
      title: String(data.title ?? ""), status: decision };
  });
  if (!result) throw new ProductRepositoryError(503, "No se pudo completar la revisión.");
  if (decision === "approved") await markPublicMarketplaceChanged();
  return result as { ownerUid: string; storeId: string; title: string; status: string };
}

export async function listManualReviewStoreProducts() {
  const products = getAdminDb().collection("products");
  const [pending, legacy] = await Promise.all([
    products.where("reviewStatus", "==", "manual_review").limit(100).get(),
    products.where("visibility", "==", "published").limit(300).get(),
  ]);
  const records = [...pending.docs, ...legacy.docs.filter((doc) => {
    const product = toProductRecord(doc.id, doc.data());
    return needsLegacyProductReview({ visibility: product.visibility, reviewStatus: product.reviewStatus,
      createdAt: product.createdAt.toMillis(), updatedAt: product.updatedAt.toMillis() });
  })];
  const unique = [...new Map(records.map((doc) => [doc.id, doc])).values()].slice(0, 100);
  return unique.map((doc) => {
    const product = toProductRecord(doc.id, doc.data());
    return { id: product.id, kind: "store-product" as const, title: product.title,
      description: product.description, imageUrl: product.imageUrls[0] ?? "",
      priceType: product.priceType, priceAmount: product.priceAmount,
      ownerUid: product.ownerUid, storeId: product.storeId,
      contentVersion: product.contentVersion || 1,
      screeningReason: product.reviewReason ?? (product.reviewStatus === "legacy" ?
        "Producto anterior sin revisión automática; requiere revisión manual." : null),
      createdAt: product.createdAt.toMillis(), sellerName: "Vendedor de tienda", location: "",
      durationHours: null };
  });
}

export async function decideManualStoreProduct(id: string, version: number, decision: "approved" | "blocked", reason: string) {
  const db = getAdminDb();
  const ref = db.collection("products").doc(id);
  let result: { ownerUid: string; storeId: string; title: string } | null = null;
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) throw new ProductRepositoryError(404, "Producto no encontrado.");
    const data = snapshot.data()!;
    const prior = toProductRecord(snapshot.id, data);
    const legacy = needsLegacyProductReview({ visibility: prior.visibility, reviewStatus: prior.reviewStatus,
      createdAt: prior.createdAt.toMillis(), updatedAt: prior.updatedAt.toMillis() });
    if (!((data.reviewStatus === "manual_review" && data.contentVersion === version) ||
      (legacy && version === 1))) {
      throw new ProductRepositoryError(409, "El producto ya cambió o fue revisado.");
    }
    tx.update(ref, {
      contentVersion: version,
      reviewStatus: decision, reviewReason: decision === "approved" ? null : reason.slice(0, 180),
      approvedVersion: decision === "approved" ? version : null, screenedAt: Timestamp.now(),
    });
    result = { ownerUid: String(data.ownerUid ?? ""), storeId: String(data.storeId ?? ""), title: String(data.title ?? "") };
  });
  if (!result) throw new ProductRepositoryError(503, "No se pudo resolver la revisión.");
  await markPublicMarketplaceChanged();
  return result as { ownerUid: string; storeId: string; title: string };
}

export async function listProductsForAdmin(storeId: string): Promise<ProductRecord[]> {
  const snapshot = await getAdminDb()
    .collection("products")
    .where("storeId", "==", storeId)
    .get();

  return snapshot.docs
    .map((document) => toProductRecord(document.id, document.data()))
    .sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis());
}

export async function promoteSuggestedCategoriesForStore(storeId: string): Promise<void> {
  const products = await listProductsForAdmin(storeId);
  const suggestions = [
    ...new Set(
      products
        .map((product) => product.suggestedCategoryName?.trim() ?? "")
        .filter(Boolean),
    ),
  ];

  if (suggestions.length === 0) return;

  const promoted = new Map<string, string>();
  for (const suggestion of suggestions) {
    const category = await promoteSuggestedCategory(suggestion);
    promoted.set(normalizeCategoryName(suggestion), category.id);
  }

  const db = getAdminDb();
  const batch = db.batch();
  let changed = false;

  for (const product of products) {
    if (!product.suggestedCategoryName) continue;
    const categoryId = promoted.get(normalizeCategoryName(product.suggestedCategoryName));
    if (!categoryId) continue;

    batch.update(db.collection("products").doc(product.id), {
      categoryId,
      suggestedCategoryName: null,
      updatedAt: Timestamp.now(),
    });
    changed = true;
  }

  if (changed) await batch.commit();
}
