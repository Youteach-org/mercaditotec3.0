import type { User } from "firebase/auth";

import { storeApiFetch } from "../store/client";
import type { OrderStatus } from "./domain";

export interface OrderApiRecord {
  id: string;
  buyerDisplayName: string;
  storeId: string;
  storeSlug: string;
  storeName: string;
  productId: string;
  productTitle: string;
  productImageUrl: string | null;
  priceType: "fixed" | "negotiable" | "ask";
  priceAmount: number | null;
  quantity: number;
  note: string;
  deliveryLocation: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

async function orderResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? "No se pudo procesar el pedido.");
  }
  return data;
}

export async function createOrderRequest(
  user: User,
  input: { storeId: string; productId: string; quantity: number; note?: string },
): Promise<OrderApiRecord> {
  const response = await storeApiFetch(user, "/api/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return (await orderResponse(response)).order as OrderApiRecord;
}

export async function loadOrders(
  user: User,
  role: "buyer" | "seller",
): Promise<OrderApiRecord[]> {
  const response = await storeApiFetch(user, `/api/orders?role=${role}`);
  const data = await orderResponse(response);
  return Array.isArray(data.orders) ? data.orders : [];
}

export async function changeOrderStatus(
  user: User,
  orderId: string,
  status: OrderStatus,
): Promise<OrderApiRecord> {
  const response = await storeApiFetch(
    user,
    `/api/orders/${encodeURIComponent(orderId)}/status`,
    {
      method: "POST",
      body: JSON.stringify({ status }),
    },
  );
  return (await orderResponse(response)).order as OrderApiRecord;
}
