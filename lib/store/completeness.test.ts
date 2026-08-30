import { describe, expect, it } from "vitest";

import { validateStoreCompleteness } from "./completeness";
import { createEmptyStoreSchedule, toggleScheduleHour } from "./schedule";

const baseSchedule = toggleScheduleHour(
  createEmptyStoreSchedule(),
  "monday",
  "07:00",
);

const baseStore = {
  name: "Dulces Fer",
  description: "Dulces y postres para estudiantes.",
  deliveryLocation: "Entrego afuera de cafetería y en el edificio A.",
  schedule: baseSchedule,
};

const validProduct = {
  title: "Brownie",
  imageUrls: ["https://example.com/a.jpg"],
  categoryId: "postres",
  priceType: "fixed" as const,
  priceAmount: 40,
  visibility: "published" as const,
};

describe("validateStoreCompleteness", () => {
  it("exige descripcion de tienda", () => {
    expect(() =>
      validateStoreCompleteness({ ...baseStore, description: "" }, [validProduct]),
    ).toThrow("Agrega una descripción de la tienda.");
  });

  it("exige indicar dónde se entrega", () => {
    expect(() =>
      validateStoreCompleteness({ ...baseStore, deliveryLocation: "" }, [validProduct]),
    ).toThrow("Indica dónde entregas dentro del Tec.");
  });

  it("exige al menos una hora de atención", () => {
    expect(() =>
      validateStoreCompleteness(
        { ...baseStore, schedule: createEmptyStoreSchedule() },
        [validProduct],
      ),
    ).toThrow("Selecciona al menos una hora de atención.");
  });

  it("exige al menos un producto publicado", () => {
    expect(() => validateStoreCompleteness(baseStore, [])).toThrow(
      "Debes tener al menos un producto publicado antes de guardar la tienda.",
    );
  });

  it("productos ocultos no cuentan", () => {
    expect(() =>
      validateStoreCompleteness(baseStore, [{ ...validProduct, visibility: "hidden" }]),
    ).toThrow("Debes tener al menos un producto publicado antes de guardar la tienda.");
  });

  it("producto publicado exige foto", () => {
    expect(() =>
      validateStoreCompleteness(baseStore, [{ ...validProduct, imageUrls: [] }]),
    ).toThrow('El producto "Brownie" necesita al menos una foto.');
  });

  it("acepta una categoria sugerida", () => {
    expect(() =>
      validateStoreCompleteness(baseStore, [
        {
          ...validProduct,
          categoryId: "",
          suggestedCategoryName: "Robótica educativa",
        },
      ]),
    ).not.toThrow();
  });

  it("producto publicado exige categoria o sugerencia", () => {
    expect(() =>
      validateStoreCompleteness(baseStore, [
        { ...validProduct, categoryId: "", suggestedCategoryName: null },
      ]),
    ).toThrow('El producto "Brownie" necesita una categoría.');
  });

  it("precio fijo exige importe positivo", () => {
    expect(() =>
      validateStoreCompleteness(baseStore, [{ ...validProduct, priceAmount: 0 }]),
    ).toThrow('El producto "Brownie" necesita un precio válido.');
  });

  it("acepta tienda completa", () => {
    expect(() =>
      validateStoreCompleteness(baseStore, [
        validProduct,
        {
          title: "Retrato",
          imageUrls: ["https://example.com/b.jpg"],
          categoryId: "servicios",
          priceType: "ask",
          priceAmount: null,
          visibility: "published",
        },
      ]),
    ).not.toThrow();
  });
});
