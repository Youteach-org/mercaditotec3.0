import {
  Timestamp,
} from "firebase-admin/firestore";

import {
  getAdminDb,
} from "../firebaseAdmin";

import {
  canOwnerEditStore,
} from "./domain";

import {
  validateStoreMediaUrl,
} from "./media";

import {
  getStoreForOwner,
  StoreRepositoryError,
  type StoreRecord,
} from "./repository";

export async function setStoreMedia(
  ownerUid: string,
  storeId: string,
  kind: "logo" | "cover",
  url: string | null,
): Promise<StoreRecord> {
  const store =
    await getStoreForOwner(
      ownerUid,
      storeId,
    );

  if (
    !canOwnerEditStore(
      store.status,
    )
  ) {
    throw new StoreRepositoryError(
      409,
      "La tienda está en revisión y no puede editarse.",
    );
  }

  if (url) {
    validateStoreMediaUrl(
      url,
      storeId,
      kind,
    );
  }

  const field =
    kind === "logo"
      ? "logoUrl"
      : "coverUrl";

  const now =
    Timestamp.now();

  await getAdminDb()
    .collection("stores")
    .doc(storeId)
    .update({
      [field]: url,
      updatedAt: now,
    });

  return {
    ...store,

    [field]: url,

    updatedAt: now,
  };
}
