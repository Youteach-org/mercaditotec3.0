import { describe, expect, it } from "vitest";
import { publisherWhatsappUrl } from "./contact";

describe("WhatsApp contact on personal Descubre listings", () => {
  it("uses the number already registered by the publisher", () => {
    expect(publisherWhatsappUrl({ whatsappNumber: "+524431234567" })).toBe("https://wa.me/524431234567");
    expect(publisherWhatsappUrl({ whatsappNumber: "443 123 4567" })).toBe("https://wa.me/524431234567");
  });
  it("does not generate a contact link for missing or invalid numbers", () => {
    expect(publisherWhatsappUrl(undefined)).toBeNull();
    expect(publisherWhatsappUrl({ whatsappNumber: "" })).toBeNull();
    expect(publisherWhatsappUrl({ whatsappNumber: "abc" })).toBeNull();
  });
});
