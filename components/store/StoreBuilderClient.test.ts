import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(currentDirectory, "StoreBuilderClient.tsx"), "utf8");

describe("StoreBuilderClient WhatsApp requirement", () => {
  it("shows WhatsApp as a seller-only required field", () => {
    expect(source).toContain("WhatsApp de contacto");
    expect(source).toContain("Obligatorio solo para vendedores");
    expect(source).toContain("whatsappNumber");
  });

  it("persists WhatsApp through the authenticated profile API", () => {
    expect(source).toContain("persistWhatsapp");
    expect(source).toContain('"/api/profile"');
    expect(source).toContain("await persistWhatsapp(true)");
  });
});
