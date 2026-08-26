import {
  Timestamp,
  type DocumentData,
} from "firebase-admin/firestore";

import {
  getAdminDb,
} from "../firebaseAdmin";

import {
  canOwnerEditStore,
  type StoreStatus,
} from "./domain";

import {
  getStoreForOwner,
  StoreRepositoryError,
  type StoreRuleRecord,
} from "./repository";

import {
  requireActiveCategory,
} from "./categoryRepository";

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

export interface ProductRecord
  extends ProductOwnershipRecord {
  title: string;
  description: string;

  imageUrls: string[];

  categoryId: string;

  priceType:
    ProductPriceType;

  priceAmount:
    number | null;

  visibility:
    ProductVisibility;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class ProductRepositoryError
  extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function assertStoreAllowsProductEditing(
  store: {
    status: StoreStatus;
  },
): void {
  if (
    !canOwnerEditStore(
      store.status,
    )
  ) {
    throw new ProductRepositoryError(
      409,
      "La tienda está en revisión y sus productos no pueden modificarse.",
    );
  }
}

export function assertProductOwnership(
  ownerUid: string,
  storeId: string,
  product:
    ProductOwnershipRecord,
): void {
  if (
    product.ownerUid !== ownerUid ||
    product.storeId !== storeId
  ) {
    throw new ProductRepositoryError(
      404,
      "Producto no encontrado.",
    );
  }
}

export function buildNewProductRecord(
  ownerUid: string,
  storeId: string,
  productId: string,
  input: ProductEditableInput,
) {
  const validated =
    validateProductInput(input);

  return {
    id: productId,
    ownerUid,
    storeId,

    ...validated,
  };
}

function toProductRecord(
  id: string,
  data: DocumentData,
): ProductRecord {
  return {
    id,

    ownerUid:
      String(
        data.ownerUid ?? "",
      ),

    storeId:
      String(
        data.storeId ?? "",
      ),

    title:
      String(
        data.title ?? "",
      ),

    description:
      String(
        data.description ?? "",
      ),

    imageUrls:
      Array.isArray(
        data.imageUrls,
      )
        ? data.imageUrls.filter(
            (
              value: unknown,
            ): value is string =>
              typeof value ===
              "string",
          )
        : [],

    categoryId:
      String(
        data.categoryId ?? "",
      ),

    priceType:
      data.priceType as
        ProductPriceType,

    priceAmount:
      typeof data.priceAmount ===
      "number"
        ? data.priceAmount
        : null,

    visibility:
      data.visibility as
        ProductVisibility,

    createdAt:
      data.createdAt as Timestamp,

    updatedAt:
      data.updatedAt as Timestamp,
  };
}

async function getEditableStore(
  ownerUid: string,
  storeId: string,
): Promise<StoreRuleRecord> {
  const store =
    await getStoreForOwner(
      ownerUid,
      storeId,
    );

  assertStoreAllowsProductEditing(
    store,
  );

  return store;
}

export async function createProduct(
  ownerUid: string,
  storeId: string,
  input: ProductEditableInput,
): Promise<ProductRecord> {
  await getEditableStore(
    ownerUid,
    storeId,
  );

  const db =
    getAdminDb();

  const reference =
    db.collection(
      "products",
    ).doc();

  const base =
    buildNewProductRecord(
      ownerUid,
      storeId,
      reference.id,
      input,
    );

  if (
    base.visibility ===
    "published"
  ) {
    await requireActiveCategory(
      base.categoryId,
    );
  }

  const now =
    Timestamp.now();

  const product:
    ProductRecord = {
    ...base,
    createdAt: now,
    updatedAt: now,
  };

  await reference.set(
    product,
  );

  return product;
}

export async function listProductsForOwner(
  ownerUid: string,
  storeId: string,
): Promise<ProductRecord[]> {
  await getStoreForOwner(
    ownerUid,
    storeId,
  );

  const snapshot =
    await getAdminDb()
      .collection("products")
      .where(
        "storeId",
        "==",
        storeId,
      )
      .get();

  return snapshot.docs
    .map(
      (document) =>
        toProductRecord(
          document.id,
          document.data(),
        ),
    )
    .filter(
      (product) =>
        product.ownerUid ===
        ownerUid,
    )
    .sort(
      (a, b) =>
        b.updatedAt.toMillis() -
        a.updatedAt.toMillis(),
    );
}

async function getProductForOwner(
  ownerUid: string,
  storeId: string,
  productId: string,
): Promise<ProductRecord> {
  const snapshot =
    await getAdminDb()
      .collection("products")
      .doc(productId)
      .get();

  if (!snapshot.exists) {
    throw new ProductRepositoryError(
      404,
      "Producto no encontrado.",
    );
  }

  const product =
    toProductRecord(
      snapshot.id,
      snapshot.data()!,
    );

  assertProductOwnership(
    ownerUid,
    storeId,
    product,
  );

  return product;
}

export async function updateProduct(
  ownerUid: string,
  storeId: string,
  productId: string,
  input: ProductEditableInput,
): Promise<ProductRecord> {
  await getEditableStore(
    ownerUid,
    storeId,
  );

  const current =
    await getProductForOwner(
      ownerUid,
      storeId,
      productId,
    );

  const validated =
    validateProductInput(input);

  if (
    validated.visibility ===
    "published"
  ) {
    await requireActiveCategory(
      validated.categoryId,
    );
  }

  const now =
    Timestamp.now();

  const next:
    ProductRecord = {
    ...current,
    ...validated,
    updatedAt: now,
  };

  await getAdminDb()
    .collection("products")
    .doc(productId)
    .update({
      title:
        next.title,

      description:
        next.description,

      imageUrls:
        next.imageUrls,

      categoryId:
        next.categoryId,

      priceType:
        next.priceType,

      priceAmount:
        next.priceAmount,

      visibility:
        next.visibility,

      updatedAt: now,
    });

  return next;
}

export async function deleteProduct(
  ownerUid: string,
  storeId: string,
  productId: string,
): Promise<void> {
  await getEditableStore(
    ownerUid,
    storeId,
  );

  await getProductForOwner(
    ownerUid,
    storeId,
    productId,
  );

  await getAdminDb()
    .collection("products")
    .doc(productId)
    .delete();
}

export async function listProductsForAdmin(
  storeId: string,
): Promise<ProductRecord[]> {
  const snapshot =
    await getAdminDb()
      .collection("products")
      .where(
        "storeId",
        "==",
        storeId,
      )
      .get();

  return snapshot.docs
    .map(
      (document) =>
        toProductRecord(
          document.id,
          document.data(),
        ),
    )
    .sort(
      (a, b) =>
        b.updatedAt.toMillis() -
        a.updatedAt.toMillis(),
    );
}

