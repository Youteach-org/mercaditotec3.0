import { describe, expect, it } from "vitest";

import {
  adminActionLabel,
  adminTabs,
  actionsForStoreStatus,
} from "./adminClient";

describe("adminTabs", () => {
  it("incluye las cuatro vistas de moderación", () => {
    expect(adminTabs.map((tab) => tab.status)).toEqual([
      "pending_review",
      "changes_required",
      "active",
      "suspended",
    ]);
  });
});

describe("actionsForStoreStatus", () => {
  it("permite aprobar o pedir cambios cuando está pendiente", () => {
    expect(actionsForStoreStatus("pending_review")).toEqual([
      "approve",
      "changes_required",
    ]);
  });

  it("permite suspender una tienda activa", () => {
    expect(actionsForStoreStatus("active")).toEqual([
      "suspend",
    ]);
  });

  it("permite reactivar una tienda suspendida", () => {
    expect(actionsForStoreStatus("suspended")).toEqual([
      "reactivate",
    ]);
  });

  it("no ofrece acciones mientras espera correcciones del vendedor", () => {
    expect(actionsForStoreStatus("changes_required")).toEqual([]);
  });
});

describe("adminActionLabel", () => {
  it("usa las etiquetas aprobadas", () => {
    expect(adminActionLabel("approve")).toBe("Aprobar");
    expect(adminActionLabel("changes_required")).toBe("Requiere cambios");
    expect(adminActionLabel("suspend")).toBe("Suspender");
    expect(adminActionLabel("reactivate")).toBe("Reactivar");
  });
});
