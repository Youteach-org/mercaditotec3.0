import { describe, expect, it } from "vitest";

import {
  assertInitialProductCreationAllowed,
  assertProductOwnership,
  assertStoreAllowsProductEditing,
  buildNewProductRecord,
} from "./productRepository";

describe("assertStoreAllowsProductEditing", () => {
  it("permite editar productos en draft", () => {
    expect(() =>
      assertStoreAllowsProductEditing({ status: "draft" }),
    ).not.toThrow();
  });

  it("bloquea productos mientras la tienda esta en revision", () => {
    expect(() =>
      assertStoreAllowsProductEditing({ status: "pending_review" }),
    ).toThrow(
      "La tienda está en revisión y sus productos no pueden modificarse.",
    );
  });

  it("permite corregir una tienda suspendida", () => {
    expect(() =>
      assertStoreAllowsProductEditing({ status: "suspended" }),
    ).not.toThrow();
  });
});

describe("assertInitialProductCreationAllowed", () => {
  it("permite el primer producto mientras la tienda no esta aprobada", () => {
    expect(() => assertInitialProductCreationAllowed("draft", 0)).not.toThrow();
    expect(() => assertInitialProductCreationAllowed("changes_required", 0)).not.toThrow();
  });

  it("bloquea un segundo producto antes de aprobar la tienda", () => {
    expect(() => assertInitialProductCreationAllowed("draft", 1)).toThrow(
      "Antes de aprobar tu tienda solo puedes registrar un producto inicial.",
    );
  });

  it("permite varios productos cuando la tienda ya esta activa", () => {
    expect(() => assertInitialProductCreationAllowed("active", 8)).not.toThrow();
  });
});

describe("assertProductOwnership", () => {
  it("acepta al dueño correcto", () => {
    expect(() =>
      assertProductOwnership(
        "uid-1",
        "store-1",
        {
          id: "product-1",
          ownerUid: "uid-1",
          storeId: "store-1",
        },
      ),
    ).not.toThrow();
  });

  it("rechaza producto ajeno", () => {
    expect(() =>
      assertProductOwnership(
        "uid-attacker",
        "store-1",
        {
          id: "product-1",
          ownerUid: "uid-owner",
          storeId: "store-1",
        },
      ),
    ).toThrow(
      "Producto no encontrado.",
    );
  });

  it("rechaza producto de otra tienda", () => {
    expect(() =>
      assertProductOwnership(
        "uid-1",
        "store-2",
        {
          id: "product-1",
          ownerUid: "uid-1",
          storeId: "store-1",
        },
      ),
    ).toThrow(
      "Producto no encontrado.",
    );
  });
});

describe("buildNewProductRecord", () => {
  it("liga el producto a tienda y propietario", () => {
    const result =
      buildNewProductRecord(
        "uid-1",
        "store-1",
        "product-1",
        {
          title: "Brownie",
          description: "Chocolate",
          imageUrls: [],
          categoryId: "postres",
          priceType: "fixed",
          priceAmount: 45,
          visibility: "hidden",
        },
      );

    expect(result.id).toBe("product-1");
    expect(result.storeId).toBe("store-1");
    expect(result.ownerUid).toBe("uid-1");
    expect(result.title).toBe("Brownie");
    expect(result.visibility).toBe("hidden");
  });
});
