import { Timestamp } from "firebase-admin/firestore";

import { getAdminDb } from "../firebaseAdmin";
import {
  getStoreForOwner,
  StoreRepositoryError,
  type StoreRecord,
  type StoreRuleRecord,
} from "./repository";

export function buildWithdrawReviewMutation(
  ownerUid: string,
  current: StoreRuleRecord,
) {
  if (current.ownerUid !== ownerUid) {
    throw new StoreRepositoryError(
      403,
      "No tienes permiso para retirar esta tienda de revisión.",
    );
  }

  if (current.status !== "pending_review") {
    throw new StoreRepositoryError(
      409,
      "Esta tienda no está pendiente de revisión.",
    );
  }

  return {
    status: "draft" as const,
    reviewMessage: null,
  };
}

export async function withdrawStoreFromReview(
  ownerUid: string,
  storeId: string,
): Promise<StoreRecord> {
  const store = await getStoreForOwner(ownerUid, storeId);
  const mutation = buildWithdrawReviewMutation(ownerUid, store);
  const now = Timestamp.now();

  await getAdminDb()
    .collection("stores")
    .doc(storeId)
    .update({
      ...mutation,
      submittedAt: null,
      updatedAt: now,
    });

  return {
    ...store,
    ...mutation,
    submittedAt: null,
    updatedAt: now,
  };
}
