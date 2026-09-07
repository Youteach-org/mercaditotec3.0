import { describe, expect, it } from "vitest";

import { buildOrderNotification, notificationDedupeKey } from "./domain";

const order = {
  id: "order-123",
  buyerUid: "buyer-1",
  buyerDisplayName: "Ana",
  sellerUid: "seller-1",
  storeName: "Cafetería Uno",
  productTitle: "Sándwich",
};

describe("notificationDedupeKey", () => {
  it("builds a deterministic order event key", () => {
    expect(notificationDedupeKey("order-123", "accepted")).toBe(
      "order:order-123:accepted",
    );
  });
});

describe("buildOrderNotification", () => {
  it("notifies the seller when a new order is created", () => {
    expect(buildOrderNotification(order, "created")).toMatchObject({
      recipientUid: "seller-1",
      type: "order_created",
      title: "Nuevo pedido",
      href: "/mystore/orders",
      dedupeKey: "order:order-123:created",
    });
  });

  it("notifies the buyer when the seller changes the order state", () => {
    expect(buildOrderNotification(order, "accepted")).toMatchObject({
      recipientUid: "buyer-1",
      type: "order_accepted",
      title: "Pedido aceptado",
      href: "/orders",
    });
    expect(buildOrderNotification(order, "ready")).toMatchObject({
      recipientUid: "buyer-1",
      type: "order_ready",
      title: "Pedido listo",
      href: "/orders",
    });
    expect(buildOrderNotification(order, "completed")).toMatchObject({
      recipientUid: "buyer-1",
      type: "order_completed",
      title: "Pedido entregado",
      href: "/orders",
    });
    expect(buildOrderNotification(order, "rejected")).toMatchObject({
      recipientUid: "buyer-1",
      type: "order_rejected",
      title: "Pedido rechazado",
      href: "/orders",
    });
  });

  it("notifies the seller when the buyer cancels", () => {
    expect(buildOrderNotification(order, "cancelled")).toMatchObject({
      recipientUid: "seller-1",
      type: "order_cancelled",
      title: "Pedido cancelado",
      href: "/mystore/orders",
    });
  });

  it("includes short user-facing order context without emails", () => {
    const notification = buildOrderNotification(order, "created");
    expect(notification.message).toContain("Ana");
    expect(notification.message).toContain("Sándwich");
    expect(notification).not.toHaveProperty("buyerEmail");
    expect(notification).not.toHaveProperty("sellerEmail");
  });
});
