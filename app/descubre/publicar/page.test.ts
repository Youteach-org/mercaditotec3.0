import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("Publicar en Descubre", () => {
  it("uses the approved commercial heading", () => {
    expect(source).toContain("PON TUS IDEAS A LA VENTA");
    expect(source).not.toContain("¡Publica tu hallazgo!");
  });

  it("reuses saved WhatsApp or asks for one before uploading", () => {
    expect(source).toContain("appUser?.whatsappNumber");
    expect(source).toContain("!registeredWhatsapp");
    expect(source).toContain('type="tel"');
    expect(source).toContain('"/api/profile"');
    expect(source).toContain('normalizeWhatsappNumber(whatsappNumber)');
  });
});
