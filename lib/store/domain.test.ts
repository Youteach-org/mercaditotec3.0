import { describe, expect, it } from "vitest";

import {
  assertAdminTransition,
  canOwnerEditStore,
  makeStoreSlug,
  normalizeStoreName,
  validateStoreDraftInput,
} from "./domain";

describe("normalizeStoreName", () => {
  it("normaliza mayúsculas, acentos y espacios", () => {
    expect(
      normalizeStoreName("  Dulces Fer  ")
    ).toBe("dulces fer");

    expect(
      normalizeStoreName("DÚLCES   FER")
    ).toBe("dulces fer");
  });
});

describe("makeStoreSlug", () => {
  it("crea un slug válido", () => {
    expect(
      makeStoreSlug("Dulces Fer")
    ).toBe("dulces-fer");

    expect(
      makeStoreSlug("Café & Pan 2")
    ).toBe("cafe-pan-2");
  });
});

describe("validateStoreDraftInput", () => {
  it("acepta datos válidos e incluye el punto de entrega", () => {
    const result = validateStoreDraftInput({
      name: "Dulces Fer",
      description:
        "Postres y botanas para estudiantes.",
      deliveryLocation:
        "Entrego afuera de cafetería y en el edificio A.",
      marketplaceLabel: "  POSTRES CASEROS  ",
      marketplaceNote: "  LA VIDA ES MÁS DULCE  ",
      marketplaceTags: ["Postres", " Hecho a mano ", "Postres"],
      marketplaceVariant: "cloud-4",
    });

    expect(result).toEqual({
      name: "Dulces Fer",
      description:
        "Postres y botanas para estudiantes.",
      deliveryLocation:
        "Entrego afuera de cafetería y en el edificio A.",
      marketplaceLabel: "POSTRES CASEROS",
      marketplaceNote: "LA VIDA ES MÁS DULCE",
      marketplaceTags: ["Postres", "Hecho a mano"],
      marketplaceVariant: "cloud-4",
    });
    expect(result.deliveryLocation).toBe(
      "Entrego afuera de cafetería y en el edificio A.",
    );
  });


  it("rechaza una variante visual inexistente", () => {
    expect(() =>
      validateStoreDraftInput({
        name: "Tienda válida",
        description: "Prueba",
        deliveryLocation: "Cafetería",
        marketplaceVariant: "oval-99",
      })
    ).toThrow("La forma visual de la tienda no es válida.");
  });

  it("limita etiquetas y textos del collage", () => {
    expect(() =>
      validateStoreDraftInput({
        name: "Tienda válida",
        description: "Prueba",
        marketplaceLabel: "x".repeat(41),
      })
    ).toThrow("El rótulo del collage no puede exceder 40 caracteres.");

    expect(() =>
      validateStoreDraftInput({
        name: "Tienda válida",
        description: "Prueba",
        marketplaceNote: "x".repeat(91),
      })
    ).toThrow("La nota del collage no puede exceder 90 caracteres.");

    expect(() =>
      validateStoreDraftInput({
        name: "Tienda válida",
        description: "Prueba",
        marketplaceTags: ["Uno", "Dos", "Tres", "Cuatro"],
      })
    ).toThrow("Puedes mostrar como máximo 3 etiquetas en el collage.");
  });

  it("rechaza nombres demasiado cortos", () => {
    expect(() =>
      validateStoreDraftInput({
        name: "A",
        description: "Prueba",
        deliveryLocation: "Cafetería",
      })
    ).toThrow(
      "El nombre de la tienda debe tener entre 3 y 60 caracteres."
    );
  });

  it("rechaza descripciones demasiado largas", () => {
    expect(() =>
      validateStoreDraftInput({
        name: "Tienda válida",
        description: "x".repeat(601),
        deliveryLocation: "Cafetería",
      })
    ).toThrow(
      "La descripción de la tienda no puede exceder 600 caracteres."
    );
  });

  it("rechaza lugares de entrega demasiado largos", () => {
    expect(() =>
      validateStoreDraftInput({
        name: "Tienda válida",
        description: "Prueba",
        deliveryLocation: "x".repeat(241),
      })
    ).toThrow(
      "El lugar de entrega no puede exceder 240 caracteres."
    );
  });
});

describe("store lifecycle", () => {
  it("permite edición en los estados correctos", () => {
    expect(canOwnerEditStore("draft")).toBe(true);
    expect(canOwnerEditStore("changes_required")).toBe(true);
    expect(canOwnerEditStore("active")).toBe(true);
    expect(canOwnerEditStore("suspended")).toBe(true);
  });

  it("bloquea edición mientras está pendiente", () => {
    expect(
      canOwnerEditStore("pending_review")
    ).toBe(false);
  });

  it("acepta solamente transiciones administrativas válidas", () => {
    expect(() =>
      assertAdminTransition(
        "pending_review",
        "active"
      )
    ).not.toThrow();

    expect(() =>
      assertAdminTransition(
        "pending_review",
        "changes_required"
      )
    ).not.toThrow();

    expect(() =>
      assertAdminTransition(
        "active",
        "suspended"
      )
    ).not.toThrow();

    expect(() =>
      assertAdminTransition(
        "suspended",
        "active"
      )
    ).not.toThrow();

    expect(() =>
      assertAdminTransition(
        "draft",
        "active"
      )
    ).toThrow();

    expect(() =>
      assertAdminTransition(
        "changes_required",
        "active"
      )
    ).toThrow();
  });
});
