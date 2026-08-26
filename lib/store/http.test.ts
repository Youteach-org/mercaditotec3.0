import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase-admin/firestore";

import {
  parseStoreEditableInput,
  serializeStore,
  toApiError,
} from "./http";

import { ApiAuthError } from "./auth";
import { StoreRepositoryError } from "./repository";

describe("parseStoreEditableInput", () => {
  it("limpia y valida los datos recibidos desde la API", () => {
    expect(
      parseStoreEditableInput({
        name: "  Dulces Fer ",
        description: "  Postres y botanas  ",
      }),
    ).toEqual({
      name: "Dulces Fer",
      description: "Postres y botanas",
    });
  });

  it("convierte validacion invalida en error 400", () => {
    expect(() =>
      parseStoreEditableInput({
        name: "A",
        description: "",
      }),
    ).toThrow("El nombre de la tienda debe tener entre 3 y 60 caracteres.");
  });
});

describe("serializeStore", () => {
  it("convierte Timestamps a ISO y conserva datos seguros", () => {
    const date = new Date("2026-08-25T18:00:00.000Z");
    const timestamp = Timestamp.fromDate(date);

    const result = serializeStore({
      id: "store-1",
      ownerUid: "uid-1",
      name: "Dulces Fer",
      nameNormalized: "dulces fer",
      slug: "dulces-fer",
      description: "Postres",
      status: "draft",
      reviewMessage: null,
      suspensionReason: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      submittedAt: null,
      approvedAt: null,
      suspendedAt: null,
    });

    expect(result.createdAt).toBe(
      "2026-08-25T18:00:00.000Z",
    );

    expect(result.submittedAt).toBeNull();
    expect(result.slug).toBe("dulces-fer");
  });
});

describe("toApiError", () => {
  it("conserva errores de autenticacion", () => {
    expect(
      toApiError(
        new ApiAuthError(
          401,
          "Debes iniciar sesión.",
        ),
      ),
    ).toEqual({
      status: 401,
      message: "Debes iniciar sesión.",
    });
  });

  it("conserva errores del repositorio", () => {
    expect(
      toApiError(
        new StoreRepositoryError(
          409,
          "Ese nombre de tienda ya está en uso.",
        ),
      ),
    ).toEqual({
      status: 409,
      message: "Ese nombre de tienda ya está en uso.",
    });
  });

  it("no expone errores internos inesperados", () => {
    expect(
      toApiError(
        new Error("secreto interno"),
      ),
    ).toEqual({
      status: 500,
      message: "Ocurrió un error interno.",
    });
  });
});
