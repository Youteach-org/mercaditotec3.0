import { describe, expect, it } from "vitest";

import { validateProductInput } from "./productDomain";

describe("validateProductInput", () => {
  it("acepta un producto con precio fijo", () => {
    expect(
      validateProductInput({
        title: "Brownie",
        description: "Chocolate",
        imageUrls: ["https://example.com/1.jpg"],
        categoryId: "postres",
        priceType: "fixed",
        priceAmount: 45,
        visibility: "published",
      }),
    ).toEqual({
      title: "Brownie",
      description: "Chocolate",
      imageUrls: ["https://example.com/1.jpg"],
      categoryId: "postres",
      priceType: "fixed",
      priceAmount: 45,
      visibility: "published",
    });
  });

  it("acepta una categoria sugerida sin crear categoria global", () => {
    const result = validateProductInput({
      title: "Kit Arduino",
      description: "",
      imageUrls: ["https://example.com/arduino.jpg"],
      categoryId: "",
      suggestedCategoryName: "Robótica educativa",
      priceType: "fixed",
      priceAmount: 250,
      visibility: "published",
    });

    expect(result.categoryId).toBe("");
    expect(result.suggestedCategoryName).toBe("Robótica educativa");
  });

  it("rechaza un producto publicado sin imagen", () => {
    expect(() =>
      validateProductInput({
        title: "Producto",
        description: "",
        imageUrls: [],
        categoryId: "otros",
        priceType: "fixed",
        priceAmount: 20,
        visibility: "published",
      }),
    ).toThrow("Un producto visible debe tener al menos una imagen.");
  });

  it("permite borrador oculto sin imagen durante una carga interna", () => {
    expect(() =>
      validateProductInput({
        title: "Producto",
        description: "",
        imageUrls: [],
        categoryId: "otros",
        priceType: "fixed",
        priceAmount: 20,
        visibility: "hidden",
      }),
    ).not.toThrow();
  });

  it("rechaza categoria sugerida demasiado corta", () => {
    expect(() =>
      validateProductInput({
        title: "Producto",
        description: "",
        imageUrls: [],
        categoryId: "",
        suggestedCategoryName: "X",
        priceType: "fixed",
        priceAmount: 20,
        visibility: "hidden",
      }),
    ).toThrow("La categoría sugerida debe tener entre 2 y 60 caracteres.");
  });

  it("acepta precio a tratar con precio base", () => {
    expect(
      validateProductInput({
        title: "Audífonos",
        description: "",
        imageUrls: [],
        categoryId: "electronica",
        priceType: "negotiable",
        priceAmount: 300,
        visibility: "hidden",
      }).priceAmount,
    ).toBe(300);
  });

  it("acepta preguntar al vendedor sin precio numerico", () => {
    const result = validateProductInput({
      title: "Servicio de dibujo",
      description: "",
      imageUrls: [],
      categoryId: "servicios",
      priceType: "ask",
      priceAmount: null,
      visibility: "hidden",
    });

    expect(result.priceType).toBe("ask");
    expect(result.priceAmount).toBeNull();
  });

  it("rechaza precio numerico cuando es preguntar al vendedor", () => {
    expect(() =>
      validateProductInput({
        title: "Producto",
        description: "",
        imageUrls: [],
        categoryId: "otros",
        priceType: "ask",
        priceAmount: 50,
        visibility: "hidden",
      }),
    ).toThrow("Preguntar al vendedor no debe tener precio numérico.");
  });

  it("exige precio positivo para fijo", () => {
    expect(() =>
      validateProductInput({
        title: "Producto",
        description: "",
        imageUrls: [],
        categoryId: "otros",
        priceType: "fixed",
        priceAmount: 0,
        visibility: "hidden",
      }),
    ).toThrow("El precio debe ser mayor que cero.");
  });

  it("exige precio positivo para precio a tratar", () => {
    expect(() =>
      validateProductInput({
        title: "Producto",
        description: "",
        imageUrls: [],
        categoryId: "otros",
        priceType: "negotiable",
        priceAmount: -5,
        visibility: "hidden",
      }),
    ).toThrow("El precio debe ser mayor que cero.");
  });

  it("rechaza mas de cinco imagenes", () => {
    expect(() =>
      validateProductInput({
        title: "Producto",
        description: "",
        imageUrls: [
          "https://example.com/1.jpg",
          "https://example.com/2.jpg",
          "https://example.com/3.jpg",
          "https://example.com/4.jpg",
          "https://example.com/5.jpg",
          "https://example.com/6.jpg",
        ],
        categoryId: "otros",
        priceType: "fixed",
        priceAmount: 20,
        visibility: "hidden",
      }),
    ).toThrow("Un producto puede tener máximo 5 imágenes.");
  });

  it("exige categoria o sugerencia", () => {
    expect(() =>
      validateProductInput({
        title: "Producto",
        description: "",
        imageUrls: [],
        categoryId: "",
        priceType: "fixed",
        priceAmount: 20,
        visibility: "hidden",
      }),
    ).toThrow("Debes seleccionar o sugerir una categoría.");
  });

  it("exige nombre de producto", () => {
    expect(() =>
      validateProductInput({
        title: "",
        description: "",
        imageUrls: [],
        categoryId: "otros",
        priceType: "fixed",
        priceAmount: 20,
        visibility: "hidden",
      }),
    ).toThrow("El nombre del producto debe tener entre 2 y 100 caracteres.");
  });

  it("rechaza visibilidad desconocida", () => {
    expect(() =>
      validateProductInput({
        title: "Producto",
        description: "",
        imageUrls: [],
        categoryId: "otros",
        priceType: "fixed",
        priceAmount: 20,
        visibility: "publico",
      }),
    ).toThrow("Visibilidad de producto inválida.");
  });
});
