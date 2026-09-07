import { Timestamp, type DocumentData } from "firebase-admin/firestore";

import { getAdminDb } from "../firebaseAdmin";
import type { ProductPriceType } from "../store/productDomain";
import {
  assertOrderTransition,
  type CreateOrderInput,
  type OrderActor,
  type OrderStatus,
} from "./domain";

export interface OrderRecord {
  id: string;
  buyerUid: string;
  buyerDisplayName: string;
  sellerUid: string;
  storeId: string;
  storeSlug: string;
  storeName: string;
  productId: string;
  productTitle: string;
  productImageUrl: string | null;
  priceType: ProductPriceType;
  priceAmount: number | null;
  quantity: number;
  note: string;
  deliveryLocation: string;
  status: OrderStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class OrderRepositoryError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

function toOrderRecord(id: string, data: DocumentData): OrderRecord {
  return {
    id,
    buyerUid: String(data.buyerUid ?? ""),
    buyerDisplayName: String(data.buyerDisplayName ?? "Comprador"),
    sellerUid: String(data.sellerUid ?? ""),
    storeId: String(data.storeId ?? ""),
    storeSlug: String(data.storeSlug ?? ""),
    storeName: String(data.storeName ?? ""),
    productId: String(data.productId ?? ""),
    productTitle: String(data.productTitle ?? ""),
    productImageUrl: typeof data.productImageUrl === "string" ? data.productImageUrl : null,
    priceType:
      data.priceType === "negotiable" || data.priceType === "ask"
        ? data.priceType
        : "fixed",
    priceAmount: typeof data.priceAmount === "number" ? data.priceAmount : null,
    quantity: Number(data.quantity ?? 1),
    note: String(data.note ?? ""),
    deliveryLocation: String(data.deliveryLocation ?? ""),
    status: data.status as OrderStatus,
    createdAt: data.createdAt as Timestamp,
    updatedAt: data.updatedAt as Timestamp,
  };
}

async function buyerDisplayName(uid: string): Promise<string> {
  const snapshot = await getAdminDb().collection("users").doc(uid).get();
  const value = snapshot.data()?.displayName;
  if (typeof value === "string" && value.trim()) return value.trim().slice(0, 120);
  return "Comprador";
}

export async function createOrder(
  buyerUid: string,
  input: CreateOrderInput,
): Promise<OrderRecord> {
  const db = getAdminDb();
  const storeSnapshot = await db.collection("stores").doc(input.storeId).get();

  if (!storeSnapshot.exists) {
    throw new OrderRepositoryError(404, "Tienda no encontrada.");
  }

  const store = storeSnapshot.data()!;
  if (store.status !== "active") {
    throw new OrderRepositoryError(409, "La tienda no está disponible para recibir pedidos.");
  }

  const sellerUid = typeof store.ownerUid === "string" ? store.ownerUid : "";
  if (!sellerUid) throw new OrderRepositoryError(409, "La tienda no tiene un vendedor válido.");
  if (sellerUid === buyerUid) {
    throw new OrderRepositoryError(409, "No puedes solicitar productos de tu propia tienda.");
  }

  const productSnapshot = await db.collection("products").doc(input.productId).get();
  if (!productSnapshot.exists) {
    throw new OrderRepositoryError(404, "Producto no encontrado.");
  }

  const product = productSnapshot.data()!;
  if (product.storeId !== input.storeId || product.ownerUid !== sellerUid) {
    throw new OrderRepositoryError(404, "Producto no encontrado en esta tienda.");
  }
  if (product.visibility !== "published") {
    throw new OrderRepositoryError(409, "Este producto no está disponible para pedidos.");
  }

  const priceType: ProductPriceType =
    product.priceType === "negotiable" || product.priceType === "ask"
      ? product.priceType
      : "fixed";
  const priceAmount = typeof product.priceAmount === "number" ? product.priceAmount : null;
  const imageUrls = Array.isArray(product.imageUrls)
    ? product.imageUrls.filter((value: unknown): value is string => typeof value === "string")
    : [];
  const now = Timestamp.now();
  const reference = db.collection("orders").doc();

  const order: OrderRecord = {
    id: reference.id,
    buyerUid,
    buyerDisplayName: await buyerDisplayName(buyerUid),
    sellerUid,
    storeId: input.storeId,
    storeSlug: typeof store.slug === "string" ? store.slug : "",
    storeName: typeof store.name === "string" ? store.name : "Tienda",
    productId: input.productId,
    productTitle: typeof product.title === "string" ? product.title : "Producto",
    productImageUrl: imageUrls[0] ?? null,
    priceType,
    priceAmount,
    quantity: input.quantity,
    note: input.note,
    deliveryLocation:
      typeof store.deliveryLocation === "string" ? store.deliveryLocation : "",
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  await reference.set(order);
  return order;
}

export async function listOrdersForBuyer(buyerUid: string): Promise<OrderRecord[]> {
  const snapshot = await getAdminDb()
    .collection("orders")
    .where("buyerUid", "==", buyerUid)
    .limit(100)
    .get();

  return snapshot.docs
    .map((document) => toOrderRecord(document.id, document.data()))
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

export async function listOrdersForSeller(sellerUid: string): Promise<OrderRecord[]> {
  const snapshot = await getAdminDb()
    .collection("orders")
    .where("sellerUid", "==", sellerUid)
    .limit(100)
    .get();

  return snapshot.docs
    .map((document) => toOrderRecord(document.id, document.data()))
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

export async function setOrderStatus(
  actorUid: string,
  orderId: string,
  target: OrderStatus,
): Promise<OrderRecord> {
  const db = getAdminDb();
  const reference = db.collection("orders").doc(orderId);
  let result: OrderRecord | null = null;

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) throw new OrderRepositoryError(404, "Pedido no encontrado.");

    const current = toOrderRecord(snapshot.id, snapshot.data()!);
    let actor: OrderActor;
    if (current.buyerUid === actorUid) actor = "buyer";
    else if (current.sellerUid === actorUid) actor = "seller";
    else throw new OrderRepositoryError(404, "Pedido no encontrado.");

    try {
      assertOrderTransition(actor, current.status, target);
    } catch (error) {
      throw new OrderRepositoryError(
        409,
        error instanceof Error ? error.message : "Cambio de estado no permitido.",
      );
    }

    const updatedAt = Timestamp.now();
    transaction.update(reference, { status: target, updatedAt });
    result = { ...current, status: target, updatedAt };
  });

  if (!result) throw new OrderRepositoryError(500, "No se pudo actualizar el pedido.");
  return result;
}
