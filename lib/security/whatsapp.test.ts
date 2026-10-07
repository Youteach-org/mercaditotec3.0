import { describe, expect, it } from "vitest";

import {
  normalizeWhatsappNumber,
  whatsappUrlFromNumber,
} from "./whatsapp";

describe("normalizeWhatsappNumber", () => {
  it("normalizes 10-digit Mexican numbers", () => {
    expect(normalizeWhatsappNumber("4431234567")).toBe("+524431234567");
  });

  it("normalizes formatted Mexican numbers", () => {
    expect(normalizeWhatsappNumber("(443) 123-4567")).toBe("+524431234567");
  });

  it("normalizes Mexican country code without plus", () => {
    expect(normalizeWhatsappNumber("52 443 123 4567")).toBe("+524431234567");
  });

  it("normalizes Mexican country code with plus", () => {
    expect(normalizeWhatsappNumber("+52 443 123 4567")).toBe("+524431234567");
  });

  it("allows clearing the number", () => {
    expect(normalizeWhatsappNumber("   ")).toBe("");
  });

  it("rejects malformed or too-short input", () => {
    expect(() => normalizeWhatsappNumber("123")).toThrow();
    expect(() => normalizeWhatsappNumber("44AB123456")).toThrow();
    expect(() => normalizeWhatsappNumber("++524431234567")).toThrow();
  });
});

describe("whatsappUrlFromNumber", () => {
  it("builds a digits-only wa.me URL", () => {
    expect(whatsappUrlFromNumber("+524431234567")).toBe(
      "https://wa.me/524431234567",
    );
  });

  it("returns null for an empty contact", () => {
    expect(whatsappUrlFromNumber("")).toBeNull();
  });
});
