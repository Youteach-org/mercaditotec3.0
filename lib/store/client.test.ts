import { describe, expect, it } from "vitest";

import {
  canOwnerEditStoreView,
  canOwnerSubmitStore,
  storeStatusLabel,
  submitButtonLabel,
} from "./client";

describe("storeStatusLabel", () => {
  it("usa las etiquetas aprobadas en español", () => {
    expect(storeStatusLabel("draft")).toBe("Borrador");
    expect(storeStatusLabel("pending_review")).toBe("Pendiente de revisión");
    expect(storeStatusLabel("changes_required")).toBe("Requiere cambios");
    expect(storeStatusLabel("active")).toBe("Activa");
    expect(storeStatusLabel("suspended")).toBe("Suspendida");
  });
});

describe("seller actions", () => {
  it("solo permite enviar draft y changes_required", () => {
    expect(canOwnerSubmitStore("draft")).toBe(true);
    expect(canOwnerSubmitStore("changes_required")).toBe(true);

    expect(canOwnerSubmitStore("pending_review")).toBe(false);
    expect(canOwnerSubmitStore("active")).toBe(false);
    expect(canOwnerSubmitStore("suspended")).toBe(false);
  });

  it("bloquea edición mientras administración revisa", () => {
    expect(canOwnerEditStoreView("pending_review")).toBe(false);

    expect(canOwnerEditStoreView("draft")).toBe(true);
    expect(canOwnerEditStoreView("changes_required")).toBe(true);
    expect(canOwnerEditStoreView("active")).toBe(true);
    expect(canOwnerEditStoreView("suspended")).toBe(true);
  });

  it("cambia el texto del botón al reenviar", () => {
    expect(submitButtonLabel("draft")).toBe("Enviar a revisión");

    expect(
      submitButtonLabel("changes_required"),
    ).toBe("Enviar nuevamente a revisión");
  });
});
