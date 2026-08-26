import { describe, expect, it } from "vitest";

import {
  assertProductImageUrlsForStore,
  buildStoreMediaPath,
  validateMediaFileMeta,
  validateStoreMediaUrl,
} from "./media";

describe("validateMediaFileMeta", () => {
  it("acepta jpeg, png, webp y gif hasta 1 MB", () => {
    expect(() =>
      validateMediaFileMeta({
        type: "image/jpeg",
        size: 900_000,
      }),
    ).not.toThrow();

    expect(() =>
      validateMediaFileMeta({
        type: "image/webp",
        size: 1_048_576,
      }),
    ).not.toThrow();
  });

  it("rechaza archivos mayores a 1 MB", () => {
    expect(() =>
      validateMediaFileMeta({
        type: "image/png",
        size: 1_048_577,
      }),
    ).toThrow(
      "La imagen no puede superar 1 MB.",
    );
  });

  it("rechaza MIME no permitido", () => {
    expect(() =>
      validateMediaFileMeta({
        type: "image/svg+xml",
        size: 1000,
      }),
    ).toThrow(
      "Formato de imagen no permitido.",
    );
  });
});

describe("buildStoreMediaPath", () => {
  it("crea ruta de logo", () => {
    expect(
      buildStoreMediaPath({
        storeId: "store-1",
        kind: "logo",
        nonce: "abc123",
        mimeType: "image/png",
      }),
    ).toBe(
      "stores/store-1/logo/abc123.png",
    );
  });

  it("crea ruta de portada", () => {
    expect(
      buildStoreMediaPath({
        storeId: "store-1",
        kind: "cover",
        nonce: "abc123",
        mimeType: "image/jpeg",
      }),
    ).toBe(
      "stores/store-1/cover/abc123.jpg",
    );
  });

  it("exige productId para imagen de producto", () => {
    expect(() =>
      buildStoreMediaPath({
        storeId: "store-1",
        kind: "product",
        nonce: "abc123",
        mimeType: "image/webp",
      }),
    ).toThrow(
      "Falta el producto para guardar la imagen.",
    );
  });
});

describe("validateStoreMediaUrl", () => {
  const logo =
    "https://syvfxcqceyijofkgxviu.supabase.co/storage/v1/object/public/chat-images/stores/store-1/logo/a.png";

  it("acepta un logo de la tienda correcta", () => {
    expect(() =>
      validateStoreMediaUrl(
        logo,
        "store-1",
        "logo",
      ),
    ).not.toThrow();
  });

  it("rechaza imagen de otra tienda", () => {
    expect(() =>
      validateStoreMediaUrl(
        logo,
        "store-2",
        "logo",
      ),
    ).toThrow(
      "La imagen no pertenece a esta tienda.",
    );
  });
});

describe("assertProductImageUrlsForStore", () => {
  it("acepta fotos del producto correcto", () => {
    expect(() =>
      assertProductImageUrlsForStore(
        [
          "https://syvfxcqceyijofkgxviu.supabase.co/storage/v1/object/public/chat-images/stores/store-1/products/product-1/a.webp",
        ],
        "store-1",
        "product-1",
      ),
    ).not.toThrow();
  });

  it("rechaza fotos de otro producto", () => {
    expect(() =>
      assertProductImageUrlsForStore(
        [
          "https://syvfxcqceyijofkgxviu.supabase.co/storage/v1/object/public/chat-images/stores/store-1/products/product-X/a.webp",
        ],
        "store-1",
        "product-1",
      ),
    ).toThrow(
      "Una imagen no pertenece a este producto.",
    );
  });
});
