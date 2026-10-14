import { getAdminDb, Timestamp } from "../firestoreRest";
import {
  parseStoreRatingValue,
  publicStoreRatingStats,
  readStoreRatingStats,
  StoreRatingError,
  updateStoreRatingStats,
  type StoreRatingValue,
} from "./storeRating";

function storeRatingReference(storeId: string, uid: string) {
  if (!/^[a-zA-Z0-9_-]{1,120}$/.test(storeId)) {
    throw new StoreRatingError(404, "Tienda no encontrada.");
  }
  return getAdminDb().collection("stores").doc(storeId).collection("ratings").doc(uid);
}

function assertActiveStore(data: Record<string, unknown> | undefined): asserts data is Record<string, unknown> {
  if (!data || data.status !== "active") {
    throw new StoreRatingError(404, "Tienda no disponible.");
  }
}

function ownRatingValue(value: unknown): StoreRatingValue | null {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5) {
    throw new StoreRatingError(409, "La valoración guardada es inválida.");
  }
  return value as StoreRatingValue;
}

export async function getStoreRatingForUser(storeId: string, uid: string) {
  const db = getAdminDb();
  const reference = storeRatingReference(storeId, uid);
  const [store, own] = await Promise.all([
    db.collection("stores").doc(storeId).get(),
    reference.get(),
  ]);
  const data = store.data();
  assertActiveStore(data);
  const stats = readStoreRatingStats(data.ratingStats);
  return {
    ...publicStoreRatingStats(stats),
    ownRating: ownRatingValue(own.exists ? own.data()?.value : null),
    canRate: data.ownerUid !== uid,
  };
}

/** One authenticated account can leave exactly one changeable rating per store.
 * The per-account rating and totals are updated in the same transaction. */
export async function saveStoreRatingForUser(
  storeId: string,
  uid: string,
  next: StoreRatingValue,
) {
  const db = getAdminDb();
  const ratingReference = storeRatingReference(storeId, uid);
  const storeReference = db.collection("stores").doc(storeId);
  const cacheReference = db.collection("public_marketplace_cache").doc("catalog-v2");

  return db.runTransaction(async (transaction) => {
    const [store, own] = await Promise.all([
      transaction.get(storeReference),
      transaction.get(ratingReference),
    ]);
    const data = store.data();
    assertActiveStore(data);
    if (!data.ownerUid || data.ownerUid === uid) {
      throw new StoreRatingError(403, "No puedes valorar tu propia tienda.");
    }

    const previous = ownRatingValue(own.exists ? own.data()?.value : null);
    const current = readStoreRatingStats(data.ratingStats);
    if (previous === next) {
      return { ...publicStoreRatingStats(current), ownRating: next, canRate: true };
    }
    const updated = updateStoreRatingStats(current, previous, next);
    const now = Timestamp.now();
    transaction.set(ratingReference, {
      storeId,
      authorUid: uid,
      value: next,
      createdAt: own.exists ? own.data()?.createdAt ?? now : now,
      updatedAt: now,
    });
    transaction.update(storeReference, { ratingStats: updated });
    // Refresh the already-materialized marketplace without any extra queries
    // per visitor. The normal cache refresh coalesces subsequent reads.
    transaction.set(cacheReference, { revision: crypto.randomUUID() }, { merge: true });
    return { ...publicStoreRatingStats(updated), ownRating: next, canRate: true };
  });
}
