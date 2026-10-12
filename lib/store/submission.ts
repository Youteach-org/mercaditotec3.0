import { getAdminDb } from "../firestoreRest";
import {
  normalizeWhatsappNumber,
  WhatsappNumberError,
} from "../security/whatsapp";

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

export function requireValidStoreWhatsapp(value: unknown): string {
  try {
    const normalized = normalizeWhatsappNumber(value);
    if (!normalized) {
      throw new StoreRepositoryError(
        409,
        "Agrega un número de WhatsApp válido antes de enviar tu tienda a revisión.",
      );
    }
    return normalized;
  } catch (error) {
    if (error instanceof StoreRepositoryError) throw error;
    if (error instanceof WhatsappNumberError) {
      throw new StoreRepositoryError(
        409,
        "Agrega un número de WhatsApp válido antes de enviar tu tienda a revisión.",
      );
    }
    throw error;
  }
}

async function requireOwnerWhatsapp(ownerUid: string): Promise<void> {
  const snapshot = await getAdminDb().collection("users").doc(ownerUid).get();
  if (!snapshot.exists) {
    throw new StoreRepositoryError(404, "Usuario no encontrado.");
  }

  requireValidStoreWhatsapp(snapshot.data()?.whatsappNumber);
}

export async function submitCompleteStore(
  ownerUid: string,
  storeId: string,
): Promise<StoreRecord> {
  const store = await getStoreForOwner(ownerUid, storeId);

  await requireOwnerWhatsapp(ownerUid);

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
