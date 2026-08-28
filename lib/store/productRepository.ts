import { Timestamp, type DocumentData } from "firebase-admin/firestore";

import { getAdminDb } from "../firebaseAdmin";
import { canOwnerEditStore, type StoreStatus } from "./domain";
import {
  getStoreForOwner,
  type StoreRuleRecord,
} from "./repository";
import { requireActiveCategory, normalizeCategoryName } from "./categoryRepository";
import { promoteSuggestedCategory } from "./defaultCategories";
import { assertProductImageUrlsForStore } from "./media";
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
    createdAt: data.createdAt as Timestamp,
    updatedAt: data.updatedAt as Timestamp,
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

  assertProductImageUrlsForStore(base.imageUrls, storeId, reference.id);
  if (base.visibility === "published" && base.categoryId) {
    await requireActiveCategory(base.categoryId);
  }

  const now = Timestamp.now();
  const product: ProductRecord = { ...base, createdAt: now, updatedAt: now };
  await reference.set(product);
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

  assertProductImageUrlsForStore(validated.imageUrls, storeId, productId);
  if (validated.visibility === "published" && validated.categoryId) {
    await requireActiveCategory(validated.categoryId);
  }

  const now = Timestamp.now();
  const next: ProductRecord = {
    ...current,
    ...validated,
    suggestedCategoryName,
    updatedAt: now,
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
    updatedAt: now,
  });

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
