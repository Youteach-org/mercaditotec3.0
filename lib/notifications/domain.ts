export type NotificationType =
  | "order_created"
  | "order_accepted"
  | "order_rejected"
  | "order_ready"
  | "order_completed"
  | "order_cancelled";

export type OrderNotificationEvent =
  | "created"
  | "accepted"
  | "rejected"
  | "ready"
  | "completed"
  | "cancelled";

export interface OrderNotificationSource {
  id: string;
  buyerUid: string;
  buyerDisplayName: string;
  sellerUid: string;
  storeName: string;
  productTitle: string;
}

export interface NotificationDraft {
  recipientUid: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string;
  dedupeKey: string;
}

export function notificationDedupeKey(
  orderId: string,
  event: OrderNotificationEvent,
): string {
  return `order:${orderId}:${event}`;
}

export function buildOrderNotification(
  order: OrderNotificationSource,
  event: OrderNotificationEvent,
): NotificationDraft {
  const dedupeKey = notificationDedupeKey(order.id, event);

  switch (event) {
    case "created":
      return {
        recipientUid: order.sellerUid,
        type: "order_created",
        title: "Nuevo pedido",
        message: `${order.buyerDisplayName} solicitó ${order.productTitle}.`,
        href: "/mystore/orders",
        dedupeKey,
      };
    case "accepted":
      return {
        recipientUid: order.buyerUid,
        type: "order_accepted",
        title: "Pedido aceptado",
        message: `${order.storeName} aceptó tu pedido de ${order.productTitle}.`,
        href: "/orders",
        dedupeKey,
      };
    case "rejected":
      return {
        recipientUid: order.buyerUid,
        type: "order_rejected",
        title: "Pedido rechazado",
        message: `${order.storeName} no pudo aceptar tu pedido de ${order.productTitle}.`,
        href: "/orders",
        dedupeKey,
      };
    case "ready":
      return {
        recipientUid: order.buyerUid,
        type: "order_ready",
        title: "Pedido listo",
        message: `Tu pedido de ${order.productTitle} en ${order.storeName} está listo.`,
        href: "/orders",
        dedupeKey,
      };
    case "completed":
      return {
        recipientUid: order.buyerUid,
        type: "order_completed",
        title: "Pedido entregado",
        message: `Tu pedido de ${order.productTitle} en ${order.storeName} fue marcado como entregado.`,
        href: "/orders",
        dedupeKey,
      };
    case "cancelled":
      return {
        recipientUid: order.sellerUid,
        type: "order_cancelled",
        title: "Pedido cancelado",
        message: `${order.buyerDisplayName} canceló el pedido de ${order.productTitle}.`,
        href: "/mystore/orders",
        dedupeKey,
      };
  }
}
