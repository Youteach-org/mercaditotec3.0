import { getAdminDb } from "../firebaseAdmin";
import {
  getStoreForOwner,
  reservationKeyForName,
} from "./repository";

export interface StoreResetResult {
  storeId: string;
  productsDeleted: number;
}

export async function resetStoreForOwner(
  ownerUid: string,
  storeId: string,
): Promise<StoreResetResult> {
  const store = await getStoreForOwner(ownerUid, storeId);

  if (store.status !== "draft") {
    throw new Error("Solo puedes eliminar una tienda mientras está en borrador.");
  }

  const db = getAdminDb();

  const productsSnapshot = await db
    .collection("products")
    .where("storeId", "==", storeId)
    .get();

  const writer = db.bulkWriter();

  for (const product of productsSnapshot.docs) {
    writer.delete(product.ref);
  }

  await writer.close();

  const batch = db.batch();

  if (store.nameNormalized) {
    batch.delete(
      db
        .collection("store_name_reservations")
        .doc(reservationKeyForName(store.nameNormalized)),
    );
  }

  if (store.slug) {
    batch.delete(
      db.collection("store_slug_reservations").doc(store.slug),
    );
  }

  batch.delete(db.collection("stores").doc(storeId));

  await batch.commit();

  return {
    storeId,
    productsDeleted: productsSnapshot.size,
  };
}
