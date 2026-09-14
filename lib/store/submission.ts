import {
  CategoryRepositoryError,
  requireActiveCategory,
} from "./categoryRepository";
import {\n  getStudentTrust,\n  TrustRepositoryError,\n} from "@/lib/security/trustRepository";\nimport { validateStoreCompleteness } from "./completeness";
import { listProductsForOwner } from "./productRepository";
import {
  getStoreForOwner,
  StoreRepositoryError,
  submitStore,
  type StoreRecord,
} from "./repository";

export async function submitCompleteStore(
  ownerUid: string,
  storeId: string,
): Promise<StoreRecord> {
  const store = await getStoreForOwner(ownerUid, storeId);
  const products = await listProductsForOwner(ownerUid, storeId);

  try {
    validateStoreCompleteness(store, products);
  } catch (error) {
    throw new StoreRepositoryError(
      409,
      error instanceof Error ? error.message : "La tienda todavía está incompleta.",
    );
  }

  const categoryIds = [
    ...new Set(
      products
        .filter((product) => product.visibility === "published" && product.categoryId)
        .map((product) => product.categoryId),
    ),
  ];

  for (const categoryId of categoryIds) {
    try {
      await requireActiveCategory(categoryId);
    } catch (error) {
      if (error instanceof CategoryRepositoryError) {
        throw new StoreRepositoryError(409, error.message);
      }
      throw error;
    }
  }

  return submitStore(ownerUid, storeId);
}
