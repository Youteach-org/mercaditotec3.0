import { describe, expect, it } from "vitest";

import {
  assertOrderTransition,
  parseCreateOrderInput,
} from "./domain";

describe("parseCreateOrderInput", () => {
  it("accepts a valid request and trims the note", () => {
    expect(
      parseCreateOrderInput({
        storeId: "store-1",
        productId: "product-1",
        quantity: 2,
        note: "  Sin cebolla  ",
      }),
    ).toEqual({
      storeId: "store-1",
      productId: "product-1",
      quantity: 2,
      note: "Sin cebolla",
    });
  });

  it("rejects quantities outside 1 through 20", () => {
    expect(() =>
      parseCreateOrderInput({ storeId: "s", productId: "p", quantity: 0 }),
    ).toThrow("cantidad");
    expect(() =>
      parseCreateOrderInput({ storeId: "s", productId: "p", quantity: 21 }),
    ).toThrow("cantidad");
  });

  it("rejects notes longer than 500 characters", () => {
    expect(() =>
      parseCreateOrderInput({
        storeId: "s",
        productId: "p",
        quantity: 1,
        note: "x".repeat(501),
      }),
    ).toThrow("500");
  });
});

describe("assertOrderTransition", () => {
  it("allows the seller workflow", () => {
    expect(() => assertOrderTransition("seller", "pending", "accepted")).not.toThrow();
    expect(() => assertOrderTransition("seller", "pending", "rejected")).not.toThrow();
    expect(() => assertOrderTransition("seller", "accepted", "ready")).not.toThrow();
    expect(() => assertOrderTransition("seller", "ready", "completed")).not.toThrow();
  });

  it("allows the buyer to cancel pending or accepted orders", () => {
    expect(() => assertOrderTransition("buyer", "pending", "cancelled")).not.toThrow();
    expect(() => assertOrderTransition("buyer", "accepted", "cancelled")).not.toThrow();
  });

  it("rejects forbidden and terminal transitions", () => {
    expect(() => assertOrderTransition("buyer", "pending", "accepted")).toThrow();
    expect(() => assertOrderTransition("seller", "completed", "ready")).toThrow();
    expect(() => assertOrderTransition("buyer", "ready", "cancelled")).toThrow();
  });
});
