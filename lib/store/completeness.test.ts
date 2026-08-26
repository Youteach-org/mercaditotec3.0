import {
  describe,
  expect,
  it,
} from "vitest";

import {
  validateStoreCompleteness,
} from "./completeness";

const baseStore = {
  name: "Dulces Fer",
  description:
    "Dulces y postres para estudiantes.",
};

describe("validateStoreCompleteness", () => {
  it("exige descripcion de tienda", () => {
    expect(() =>
      validateStoreCompleteness(
        {
          ...baseStore,
          description: "",
        },
        [],
      ),
    ).toThrow(
      "Agrega una descripción de la tienda.",
    );
  });

  it("exige al menos un producto publicado", () => {
    expect(() =>
      validateStoreCompleteness(
        baseStore,
        [],
      ),
    ).toThrow(
      "Debes tener al menos un producto publicado antes de enviar la tienda a revisión.",
    );
  });

  it("productos ocultos no cuentan", () => {
    expect(() =>
      validateStoreCompleteness(
        baseStore,
        [
          {
            title: "Brownie",
            imageUrls: [
              "https://example.com/a.jpg",
            ],
            categoryId: "postres",
            priceType: "fixed",
            priceAmount: 40,
            visibility: "hidden",
          },
        ],
      ),
    ).toThrow(
      "Debes tener al menos un producto publicado antes de enviar la tienda a revisión.",
    );
  });

  it("producto publicado exige foto", () => {
    expect(() =>
      validateStoreCompleteness(
        baseStore,
        [
          {
            title: "Brownie",
            imageUrls: [],
            categoryId: "postres",
            priceType: "fixed",
            priceAmount: 40,
            visibility: "published",
          },
        ],
      ),
    ).toThrow(
      'El producto "Brownie" necesita al menos una foto.',
    );
  });

  it("producto publicado exige categoria", () => {
    expect(() =>
      validateStoreCompleteness(
        baseStore,
        [
          {
            title: "Brownie",
            imageUrls: [
              "https://example.com/a.jpg",
            ],
            categoryId: "",
            priceType: "fixed",
            priceAmount: 40,
            visibility: "published",
          },
        ],
      ),
    ).toThrow(
      'El producto "Brownie" necesita una categoría.',
    );
  });

  it("precio fijo exige importe positivo", () => {
    expect(() =>
      validateStoreCompleteness(
        baseStore,
        [
          {
            title: "Brownie",
            imageUrls: [
              "https://example.com/a.jpg",
            ],
            categoryId: "postres",
            priceType: "fixed",
            priceAmount: 0,
            visibility: "published",
          },
        ],
      ),
    ).toThrow(
      'El producto "Brownie" necesita un precio válido.',
    );
  });

  it("acepta tienda completa", () => {
    expect(() =>
      validateStoreCompleteness(
        baseStore,
        [
          {
            title: "Brownie",
            imageUrls: [
              "https://example.com/a.jpg",
            ],
            categoryId: "postres",
            priceType: "fixed",
            priceAmount: 40,
            visibility: "published",
          },
          {
            title: "Retrato",
            imageUrls: [
              "https://example.com/b.jpg",
            ],
            categoryId: "servicios",
            priceType: "ask",
            priceAmount: null,
            visibility: "published",
          },
        ],
      ),
    ).not.toThrow();
  });
});
