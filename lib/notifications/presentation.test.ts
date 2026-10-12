import { describe, expect, it } from "vitest";
import { publicNotificationText } from "./presentation";

describe("public-facing text for existing and future notifications", () => {
  it("relabels archived student notices in the API response without changing their stored data", () => {
    expect(publicNotificationText("Nuevo alumno por aprobar")).toBe("Nuevo usuario por aprobar");
    expect(publicNotificationText("Un alumno verificó su correo institucional."))
      .toBe("Un usuario verificó su correo institucional.");
    expect(publicNotificationText("Los alumnos confirmados")).toBe("Los usuarios confirmados");
  });
  it("simplifies any archived institutional access phrase and leaves unrelated copy intact", () => {
    expect(publicNotificationText("Acceso institucional")).toBe("Acceso");
    expect(publicNotificationText("Tu pedido fue aceptado.")).toBe("Tu pedido fue aceptado.");
  });
});
