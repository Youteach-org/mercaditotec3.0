import {
  getStudentTrust,
  TrustRepositoryError,
} from "@/lib/security/trustRepository";

import {
  CategoryRepositoryError,
  requireActiveCategory,
} from "./categoryRepository";
import { validateStoreCompleteness } from "./completeness";
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

  try {
    const trust = await getStudentTrust(ownerUid);
    if (trust.status !== "verified") {
      throw new StoreRepositoryError(
        403,
        trust.status === "revoked"
          ? "Tu confirmación de alumno está en revisión. Administración debe restaurarla antes de que puedas enviar una tienda."
          : "Necesitas estar confirmado como alumno con 2 avales antes de enviar una tienda a revisión.",
      );
    }
  } catch (error) {
    if (error instanceof StoreRepositoryError) throw error;
    if (error instanceof TrustRepositoryError) {
      throw new StoreRepositoryError(error.status, error.message);
    }
    throw error;
  }

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
