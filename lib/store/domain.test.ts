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
  it("acepta datos válidos", () => {
    expect(
      validateStoreDraftInput({
        name: "Dulces Fer",
        description:
          "Postres y botanas para estudiantes.",
      })
    ).toEqual({
      name: "Dulces Fer",
      description:
        "Postres y botanas para estudiantes.",
    });
  });

  it("rechaza nombres demasiado cortos", () => {
    expect(() =>
      validateStoreDraftInput({
        name: "A",
        description: "Prueba",
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
      })
    ).toThrow(
      "La descripción de la tienda no puede exceder 600 caracteres."
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
