import { ApiAuthError } from "../store/auth";
import { parseCreateOrderInput, parseOrderStatus } from "./domain";
import { OrderRepositoryError, type OrderRecord } from "./repository";

export class OrderHttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export function parseOrderCreateBody(input: unknown) {
  try {
    return parseCreateOrderInput(input);
  } catch (error) {
    throw new OrderHttpError(
      400,
      error instanceof Error ? error.message : "Datos de pedido inválidos.",
    );
  }
}

export function parseOrderStatusBody(input: unknown) {
  if (!input || typeof input !== "object") {
    throw new OrderHttpError(400, "Datos de estado inválidos.");
  }

  try {
    return parseOrderStatus((input as Record<string, unknown>).status);
  } catch (error) {
    throw new OrderHttpError(
      400,
      error instanceof Error ? error.message : "Estado de pedido inválido.",
    );
  }
}

export function serializeOrder(order: OrderRecord) {
  return {
    id: order.id,
    buyerDisplayName: order.buyerDisplayName,
    storeId: order.storeId,
    storeSlug: order.storeSlug,
    storeName: order.storeName,
    productId: order.productId,
    productTitle: order.productTitle,
    productImageUrl: order.productImageUrl,
    priceType: order.priceType,
    priceAmount: order.priceAmount,
    quantity: order.quantity,
    note: order.note,
    deliveryLocation: order.deliveryLocation,
    status: order.status,
    createdAt: order.createdAt.toDate().toISOString(),
    updatedAt: order.updatedAt.toDate().toISOString(),
  };
}

export function toOrderApiError(error: unknown): { status: number; message: string } {
  if (
    error instanceof ApiAuthError ||
    error instanceof OrderRepositoryError ||
    error instanceof OrderHttpError
  ) {
    return { status: error.status, message: error.message };
  }

  console.error("Unexpected order API error:", error);
  return { status: 500, message: "Ocurrió un error interno." };
}
