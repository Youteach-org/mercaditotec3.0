import { describe, expect, it } from "vitest";

import {
  parseAdminStoreStatusRequest,
  parseStoreStatusFilter,
} from "./admin";

import {
  buildAdminStatusMutation,
  StoreRepositoryError,
} from "./repository";

describe("parseStoreStatusFilter", () => {
  it("acepta estados validos", () => {
    expect(parseStoreStatusFilter("pending_review")).toBe("pending_review");
    expect(parseStoreStatusFilter("active")).toBe("active");
    expect(parseStoreStatusFilter("suspended")).toBe("suspended");
  });

  it("acepta ausencia de filtro", () => {
    expect(parseStoreStatusFilter(null)).toBeNull();
  });

  it("rechaza estados desconocidos", () => {
    expect(() => parseStoreStatusFilter("hack"))
      .toThrow("Estado de tienda inválido.");
  });
});

describe("parseAdminStoreStatusRequest", () => {
  it("acepta aprobar", () => {
    expect(
      parseAdminStoreStatusRequest({
        status: "active",
      }),
    ).toEqual({
      status: "active",
      message: undefined,
    });
  });

  it("acepta solicitar cambios", () => {
    expect(
      parseAdminStoreStatusRequest({
        status: "changes_required",
        message: "Corrige la descripción.",
      }),
    ).toEqual({
      status: "changes_required",
      message: "Corrige la descripción.",
    });
  });

  it("acepta suspender", () => {
    expect(
      parseAdminStoreStatusRequest({
        status: "suspended",
        message: "Producto no permitido.",
      }),
    ).toEqual({
      status: "suspended",
      message: "Producto no permitido.",
    });
  });

  it("rechaza draft y pending_review como acciones admin", () => {
    expect(() =>
      parseAdminStoreStatusRequest({
        status: "draft",
      }),
    ).toThrow("Acción administrativa inválida.");

    expect(() =>
      parseAdminStoreStatusRequest({
        status: "pending_review",
      }),
    ).toThrow("Acción administrativa inválida.");
  });

  it("rechaza cuerpo invalido", () => {
    expect(() =>
      parseAdminStoreStatusRequest(null),
    ).toThrow("Datos administrativos inválidos.");
  });
});

describe("transiciones administrativas", () => {
  it("convierte una transición ilegal en conflicto 409", () => {
    try {
      buildAdminStatusMutation(
        {
          id: "store-1",
          ownerUid: "uid-owner",
          name: "Dulces Fer",
          description: "",
          status: "draft",
        },
        "active",
      );

      throw new Error("La prueba debió fallar");
    } catch (error) {
      expect(error).toBeInstanceOf(StoreRepositoryError);
      expect((error as StoreRepositoryError).status).toBe(409);
    }
  });
});
