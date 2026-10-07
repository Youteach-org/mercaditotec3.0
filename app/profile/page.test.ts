import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(join(currentDirectory, "page.tsx"), "utf8");

describe("Profile WhatsApp contact UI", () => {
  it("shows and saves a WhatsApp number", () => {
    expect(pageSource).toContain("Número de WhatsApp");
    expect(pageSource).toContain("whatsappNumber");
    expect(pageSource).toContain("appUser?.whatsappNumber");
    expect(pageSource).toContain("saveProfilePatch");
  });

  it("warns that the number becomes public on stores", () => {
    expect(pageSource).toContain("contacto público");
  });
});
