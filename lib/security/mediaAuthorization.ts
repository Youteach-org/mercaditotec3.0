import { ApiAuthError } from "../store/auth";
import { getAdminDb } from "../firestoreRest";
import { parseImageUploadPath } from "../store/media";
import { getStoreForOwner } from "../store/repository";
import { assertStoreAllowsProductEditing, assertProductOwnership } from "../store/productRepository";

export async function authorizeImageUpload(uid: string, path: string): Promise<void> {
  const target = parseImageUploadPath(path, uid);
  if (!target.storeId) return;
  const store = await getStoreForOwner(uid, target.storeId);
  assertStoreAllowsProductEditing(store);
  if (target.productId) {
    const snapshot = await getAdminDb().collection("products").doc(target.productId).get();
    if (!snapshot.exists) throw new ApiAuthError(404, "Producto no encontrado.");
    const data = snapshot.data()!;
    assertProductOwnership(uid, target.storeId, {
      id: snapshot.id, storeId: String(data.storeId ?? ""), ownerUid: String(data.ownerUid ?? ""),
    });
  }
}
