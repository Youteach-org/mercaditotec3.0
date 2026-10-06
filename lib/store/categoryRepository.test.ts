import { describe, expect, it } from "vitest";

import {
  assertCategoryCanPublish,
  normalizeCategoryName,
  validateCategoryInput,
} from "./categoryRepository";

describe("normalizeCategoryName", () => {
  it("ignora mayusculas, acentos y espacios repetidos", () => {
    expect(
      normalizeCategoryName(
        "  Electrónica   y Tecnología ",
      ),
    ).toBe(
      "electronica y tecnologia",
    );
  });
});

describe("validateCategoryInput", () => {
  it("acepta una categoria valida", () => {
    expect(
      validateCategoryInput({
        name: "Postres",
        active: true,
      }),
    ).toEqual({
      name: "Postres",
      normalizedName: "postres",
      active: true,
      iconKey: "desserts",
    });
  });

  it("rechaza nombres demasiado cortos", () => {
    expect(() =>
      validateCategoryInput({
        name: "A",
        active: true,
      }),
    ).toThrow(
      "El nombre de la categoría debe tener entre 2 y 60 caracteres.",
    );
  });

  it("exige active booleano", () => {
    expect(() =>
      validateCategoryInput({
        name: "Postres",
        active: "si",
      }),
    ).toThrow(
      "El estado de la categoría no es válido.",
    );
  });
});

describe("assertCategoryCanPublish", () => {
  it("permite una categoria activa", () => {
    expect(() =>
      assertCategoryCanPublish({
        id: "cat-1",
        name: "Postres",
        normalizedName: "postres",
        active: true,
      }),
    ).not.toThrow();
  });

  it("rechaza una categoria inactiva", () => {
    expect(() =>
      assertCategoryCanPublish({
        id: "cat-1",
        name: "Postres",
        normalizedName: "postres",
        active: false,
      }),
    ).toThrow(
      "La categoría seleccionada no está disponible.",
    );
  });
});
