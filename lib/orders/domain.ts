export type OrderStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "ready"
  | "completed"
  | "cancelled";

export type OrderActor = "buyer" | "seller";

export interface CreateOrderInput {
  storeId: string;
  productId: string;
  quantity: number;
  note: string;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendiente",
  accepted: "Aceptado",
  rejected: "Rechazado",
  ready: "Listo para entregar",
  completed: "Entregado",
  cancelled: "Cancelado",
};

export function orderStatusLabel(status: OrderStatus): string {
  return STATUS_LABELS[status];
}

export function parseCreateOrderInput(input: unknown): CreateOrderInput {
  if (!input || typeof input !== "object") {
    throw new Error("Datos de pedido inválidos.");
  }

  const data = input as Record<string, unknown>;
  const storeId = typeof data.storeId === "string" ? data.storeId.trim() : "";
  const productId = typeof data.productId === "string" ? data.productId.trim() : "";
  const quantity = data.quantity;
  const note = typeof data.note === "string" ? data.note.trim() : "";

  if (!storeId || !productId) {
    throw new Error("La tienda y el producto son obligatorios.");
  }

  if (!Number.isInteger(quantity) || Number(quantity) < 1 || Number(quantity) > 20) {
    throw new Error("La cantidad debe ser un número entero entre 1 y 20.");
  }

  if (note.length > 500) {
    throw new Error("La nota no puede exceder 500 caracteres.");
  }

  return {
    storeId,
    productId,
    quantity: Number(quantity),
    note,
  };
}

export function parseOrderStatus(input: unknown): OrderStatus {
  if (
    input === "pending" ||
    input === "accepted" ||
    input === "rejected" ||
    input === "ready" ||
    input === "completed" ||
    input === "cancelled"
  ) {
    return input;
  }
  throw new Error("Estado de pedido inválido.");
}

export function assertOrderTransition(
  actor: OrderActor,
  current: OrderStatus,
  target: OrderStatus,
): void {
  const sellerAllowed =
    (current === "pending" && (target === "accepted" || target === "rejected")) ||
    (current === "accepted" && target === "ready") ||
    (current === "ready" && target === "completed");

  const buyerAllowed =
    (current === "pending" || current === "accepted") && target === "cancelled";

  if ((actor === "seller" && sellerAllowed) || (actor === "buyer" && buyerAllowed)) {
    return;
  }

  throw new Error("Cambio de estado de pedido no permitido.");
}
