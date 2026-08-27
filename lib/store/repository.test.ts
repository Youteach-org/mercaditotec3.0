import { describe, expect, it } from "vitest";

import { buildBootstrapStoreInput } from "./bootstrap";
import {
  buildAdminStatusMutation,
  buildCreateStoreMutation,
  buildOwnerStoreUpdate,
  buildSubmitMutation,
  reservationKeyForName,
} from "./repository";
import { buildWithdrawReviewMutation } from "./withdrawal";

describe("store repository rules", () => {
  it("crea una tienda como draft ligada al propietario", () => {
    const result = buildCreateStoreMutation(
      "uid-owner",
      {
        name: "Dulces Fer",
        description: "Postres",
      },
      "store-1",
    );

    expect(result.store.id).toBe("store-1");
    expect(result.store.ownerUid).toBe("uid-owner");
    expect(result.store.status).toBe("draft");
    expect(result.store.nameNormalized).toBe("dulces fer");
    expect(result.store.slug).toBe("dulces-fer");
  });

  it("prepara un borrador temporal para abrir directamente el editor completo", () => {
    expect(buildBootstrapStoreInput("ABC123-XYZ")).toEqual({
      name: "Nueva tienda abc123",
      description: "",
    });
  });

  it("genera una clave de reserva segura incluso si el nombre contiene slash", () => {
    expect(reservationKeyForName("Dulces/Fer")).not.toContain("/");
  });

  it("impide editar una tienda ajena", () => {
    expect(() =>
      buildOwnerStoreUpdate(
        "uid-attacker",
        {
          id: "store-1",
          ownerUid: "uid-owner",
          name: "Dulces Fer",
          description: "",
          status: "draft",
        },
        {
          name: "Otro nombre",
          description: "",
        },
      ),
    ).toThrow("No tienes permiso para editar esta tienda.");
  });

  it("impide editar durante pending_review", () => {
    expect(() =>
      buildOwnerStoreUpdate(
        "uid-owner",
        {
          id: "store-1",
          ownerUid: "uid-owner",
          name: "Dulces Fer",
          description: "",
          status: "pending_review",
        },
        {
          name: "Dulces Fer",
          description: "Cambio",
        },
      ),
    ).toThrow("La tienda está en revisión y no puede editarse.");
  });

  it("permite reenviar changes_required a pending_review", () => {
    const result = buildSubmitMutation(
      "uid-owner",
      {
        id: "store-1",
        ownerUid: "uid-owner",
        name: "Dulces Fer",
        description: "",
        status: "changes_required",
      },
    );

    expect(result.status).toBe("pending_review");
    expect(result.reviewMessage).toBeNull();
  });

  it("no permite al dueño enviar una tienda ajena", () => {
    expect(() =>
      buildSubmitMutation(
        "uid-attacker",
        {
          id: "store-1",
          ownerUid: "uid-owner",
          name: "Dulces Fer",
          description: "",
          status: "draft",
        },
      ),
    ).toThrow("No tienes permiso para enviar esta tienda.");
  });

  it("permite al dueño retirar su tienda de revisión y volver a draft", () => {
    expect(
      buildWithdrawReviewMutation(
        "uid-owner",
        {
          id: "store-1",
          ownerUid: "uid-owner",
          name: "Dulces Fer",
          description: "",
          status: "pending_review",
        },
      ),
    ).toEqual({
      status: "draft",
      reviewMessage: null,
    });
  });

  it("impide retirar de revisión una tienda ajena o que no esté pendiente", () => {
    expect(() =>
      buildWithdrawReviewMutation(
        "uid-attacker",
        {
          id: "store-1",
          ownerUid: "uid-owner",
          name: "Dulces Fer",
          description: "",
          status: "pending_review",
        },
      ),
    ).toThrow("No tienes permiso para retirar esta tienda de revisión.");

    expect(() =>
      buildWithdrawReviewMutation(
        "uid-owner",
        {
          id: "store-1",
          ownerUid: "uid-owner",
          name: "Dulces Fer",
          description: "",
          status: "active",
        },
      ),
    ).toThrow("Esta tienda no está pendiente de revisión.");
  });

  it("permite aprobación administrativa solo desde pending_review", () => {
    expect(
      buildAdminStatusMutation(
        {
          id: "store-1",
          ownerUid: "uid-owner",
          name: "Dulces Fer",
          description: "",
          status: "pending_review",
        },
        "active",
      ).status,
    ).toBe("active");

    expect(() =>
      buildAdminStatusMutation(
        {
          id: "store-1",
          ownerUid: "uid-owner",
          name: "Dulces Fer",
          description: "",
          status: "draft",
        },
        "active",
      ),
    ).toThrow();
  });

  it("exige mensaje para changes_required", () => {
    expect(() =>
      buildAdminStatusMutation(
        {
          id: "store-1",
          ownerUid: "uid-owner",
          name: "Dulces Fer",
          description: "",
          status: "pending_review",
        },
        "changes_required",
      ),
    ).toThrow("Debes indicar qué cambios necesita la tienda.");
  });

  it("exige motivo para suspender", () => {
    expect(() =>
      buildAdminStatusMutation(
        {
          id: "store-1",
          ownerUid: "uid-owner",
          name: "Dulces Fer",
          description: "",
          status: "active",
        },
        "suspended",
      ),
    ).toThrow("Debes indicar el motivo de la suspensión.");
  });

  it("solo admin puede reactivar mediante transición suspended -> active", () => {
    const result = buildAdminStatusMutation(
      {
        id: "store-1",
        ownerUid: "uid-owner",
        name: "Dulces Fer",
        description: "",
        status: "suspended",
      },
      "active",
    );

    expect(result.status).toBe("active");
    expect(result.suspensionReason).toBeNull();
  });
});
