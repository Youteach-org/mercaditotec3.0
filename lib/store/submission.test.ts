import { describe, expect, it } from "vitest";

import { requireValidStoreWhatsapp } from "./submission";

describe("store submission WhatsApp requirement", () => {
  it("accepts a valid saved WhatsApp number", () => {
    expect(requireValidStoreWhatsapp("+524431234567")).toBe("+524431234567");
  });

  it("accepts and normalizes a Mexican 10-digit number", () => {
    expect(requireValidStoreWhatsapp("4431234567")).toBe("+524431234567");
  });

  it("rejects a missing WhatsApp number", () => {
    expect(() => requireValidStoreWhatsapp("")).toThrow(
      "Agrega un número de WhatsApp válido antes de enviar tu tienda a revisión.",
    );
  });

  it("rejects an invalid WhatsApp number", () => {
    expect(() => requireValidStoreWhatsapp("123")).toThrow(
      "Agrega un número de WhatsApp válido antes de enviar tu tienda a revisión.",
    );
  });
});
