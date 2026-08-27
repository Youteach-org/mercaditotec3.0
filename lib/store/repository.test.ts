import { describe, expect, it } from "vitest";

import {
  buildAdminStatusMutation,
  buildCreateStoreMutation,
  buildOwnerStoreUpdate,
  buildSubmitMutation,
  reservationKeyForName,
} from "./repository";
import { buildWithdrawReviewMutation } from "./withdrawal";

describe("store repository rules", () => {
  it("crea un borrador sin URL publica", () => {
    const result = buildCreateStoreMutation(
      "uid-owner",
      { name: "Dulces Fer", description: "Postres" },
      "store-1",
    );

    expect(result.store.id).toBe("store-1");
    expect(result.store.ownerUid).toBe("uid-owner");
    expect(result.store.status).toBe("draft");
    expect(result.store.nameNormalized).toBe("dulces fer");
    expect(result.store.slug).toBeNull();
  });

  it("genera una clave de reserva segura incluso si el nombre contiene slash", () => {
    expect(reservationKeyForName("Dulces/Fer")).not.toContain("/");
  });

  it("permite editar el nombre del borrador sin generar URL", () => {
    const result = buildOwnerStoreUpdate(
      "uid-owner",
      {
        id: "store-1",
        ownerUid: "uid-owner",
        name: "Dulces Fer",
        description: "",
        status: "draft",
        slug: null,
      },
      { name: "Componentes Fer", description: "Electrónica" },
    );

    expect(result.name).toBe("Componentes Fer");
    expect(result.nameNormalized).toBe("componentes fer");
    expect(result).not.toHaveProperty("slugBase");
  });

  it("impide editar una tienda ajena", () => {
    expect(() =>
      buildOwnerStoreUpdate(
        "uid-attacker",
        { id: "store-1", ownerUid: "uid-owner", name: "Dulces Fer", description: "", status: "draft", slug: null },
        { name: "Otro nombre", description: "" },
      ),
    ).toThrow("No tienes permiso para editar esta tienda.");
  });

  it("impide editar durante pending_review", () => {
    expect(() =>
      buildOwnerStoreUpdate(
        "uid-owner",
        { id: "store-1", ownerUid: "uid-owner", name: "Dulces Fer", description: "", status: "pending_review", slug: null },
        { name: "Dulces Fer", description: "Cambio" },
      ),
    ).toThrow("La tienda está en revisión y no puede editarse.");
  });

  it("permite reenviar changes_required a pending_review sin asignar URL", () => {
    const result = buildSubmitMutation(
      "uid-owner",
      { id: "store-1", ownerUid: "uid-owner", name: "Dulces Fer", description: "", status: "changes_required", slug: null },
    );

    expect(result.status).toBe("pending_review");
    expect(result.reviewMessage).toBeNull();
  });

  it("no permite al dueño enviar una tienda ajena", () => {
    expect(() =>
      buildSubmitMutation(
        "uid-attacker",
        { id: "store-1", ownerUid: "uid-owner", name: "Dulces Fer", description: "", status: "draft", slug: null },
      ),
    ).toThrow("No tienes permiso para enviar esta tienda.");
  });

  it("permite al dueño retirar su tienda de revisión y volver a draft", () => {
    expect(
      buildWithdrawReviewMutation(
        "uid-owner",
        { id: "store-1", ownerUid: "uid-owner", name: "Dulces Fer", description: "", status: "pending_review", slug: null },
      ),
    ).toEqual({ status: "draft", reviewMessage: null });
  });

  it("impide retirar de revisión una tienda ajena o que no esté pendiente", () => {
    expect(() =>
      buildWithdrawReviewMutation(
        "uid-attacker",
        { id: "store-1", ownerUid: "uid-owner", name: "Dulces Fer", description: "", status: "pending_review", slug: null },
      ),
    ).toThrow("No tienes permiso para retirar esta tienda de revisión.");

    expect(() =>
      buildWithdrawReviewMutation(
        "uid-owner",
        { id: "store-1", ownerUid: "uid-owner", name: "Dulces Fer", description: "", status: "active", slug: "dulces-fer" },
      ),
    ).toThrow("Esta tienda no está pendiente de revisión.");
  });

  it("permite aprobación administrativa solo desde pending_review", () => {
    expect(
      buildAdminStatusMutation(
        { id: "store-1", ownerUid: "uid-owner", name: "Dulces Fer", description: "", status: "pending_review", slug: null },
        "active",
      ).status,
    ).toBe("active");

    expect(() =>
      buildAdminStatusMutation(
        { id: "store-1", ownerUid: "uid-owner", name: "Dulces Fer", description: "", status: "draft", slug: null },
        "active",
      ),
    ).toThrow();
  });

  it("exige mensaje para changes_required", () => {
    expect(() =>
      buildAdminStatusMutation(
        { id: "store-1", ownerUid: "uid-owner", name: "Dulces Fer", description: "", status: "pending_review", slug: null },
        "changes_required",
      ),
    ).toThrow("Debes indicar qué cambios necesita la tienda.");
  });

  it("exige motivo para suspender", () => {
    expect(() =>
      buildAdminStatusMutation(
        { id: "store-1", ownerUid: "uid-owner", name: "Dulces Fer", description: "", status: "active", slug: "dulces-fer" },
        "suspended",
      ),
    ).toThrow("Debes indicar el motivo de la suspensión.");
  });

  it("solo admin puede reactivar mediante transición suspended -> active", () => {
    const result = buildAdminStatusMutation(
      { id: "store-1", ownerUid: "uid-owner", name: "Dulces Fer", description: "", status: "suspended", slug: "dulces-fer" },
      "active",
    );

    expect(result.status).toBe("active");
    expect(result.suspensionReason).toBeNull();
  });
});
