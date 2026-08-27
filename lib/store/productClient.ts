import type { User } from "firebase/auth";

import { storeApiFetch } from "./client";
import type {
  ProductEditableInput,
  ProductPriceType,
  ProductVisibility,
} from "./productDomain";

export interface StoreProductApiRecord {
  id: string;
  ownerUid: string;
  storeId: string;
  title: string;
  description: string;
  imageUrls: string[];
  categoryId: string;
  priceType: ProductPriceType;
  priceAmount: number | null;
  visibility: ProductVisibility;
  createdAt: string;
  updatedAt: string;
}

async function productResponse(response: Response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "No se pudo procesar el producto.");
  }
  return data;
}

export async function loadStoreProducts(
  user: User,
  storeId: string,
): Promise<StoreProductApiRecord[]> {
  const response = await storeApiFetch(user, `/api/stores/${storeId}/products`);
  const data = await productResponse(response);
  return Array.isArray(data.products) ? data.products : [];
}

export async function createStoreProduct(
  user: User,
  storeId: string,
  input: ProductEditableInput,
): Promise<StoreProductApiRecord> {
  const response = await storeApiFetch(user, `/api/stores/${storeId}/products`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return (await productResponse(response)).product;
}

export async function updateStoreProduct(
  user: User,
  storeId: string,
  productId: string,
  input: ProductEditableInput,
): Promise<StoreProductApiRecord> {
  const response = await storeApiFetch(
    user,
    `/api/stores/${storeId}/products/${productId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  return (await productResponse(response)).product;
}

export async function deleteStoreProduct(
  user: User,
  storeId: string,
  productId: string,
): Promise<void> {
  const response = await storeApiFetch(
    user,
    `/api/stores/${storeId}/products/${productId}`,
    { method: "DELETE" },
  );
  await productResponse(response);
}
