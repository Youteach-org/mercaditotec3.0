import { describe, expect, it } from "vitest";
import { isPrivacyControllerConfigured, privacyController, privacyNoticeApprovedForPublication } from "./publicNotice";
import controller from "./controller.json";

describe("public privacy notice release readiness", () => {
  it("requires both verified identity and explicit approval to mark the notice final", () => {
    expect(privacyNoticeApprovedForPublication).toBe(
      isPrivacyControllerConfigured(privacyController) && controller.reviewedForPublication,
    );
  });

  it("requires a name, postal address and usable contact channel", () => {
    const example = {
      legalName: "Entidad de ejemplo para pruebas",
      address: "Calle de Ejemplo 123, Ciudad de Ejemplo",
      contactEmail: "legal@example.com",
    };
    expect(isPrivacyControllerConfigured(example)).toBe(true);
    expect(isPrivacyControllerConfigured({ ...example, legalName: "" })).toBe(false);
    expect(isPrivacyControllerConfigured({ ...example, address: "" })).toBe(false);
    expect(isPrivacyControllerConfigured({ ...example, contactEmail: "invalid" })).toBe(false);
  });
});
