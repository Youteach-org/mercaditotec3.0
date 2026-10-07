import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(join(currentDirectory, "page.tsx"), "utf8");

describe("Profile editing", () => {
  it("keeps editing controls behind an explicit edit mode", () => {
    expect(pageSource).toContain("Editar perfil");
    expect(pageSource).toContain("editing");
    expect(pageSource).toContain("Guardar cambios");
    expect(pageSource).toContain("Cancelar");
  });

  it("allows changing and removing the profile photo", () => {
    expect(pageSource).toContain("Cambiar foto");
    expect(pageSource).toContain("Quitar foto");
    expect(pageSource).toContain('saveProfilePatch({ photoURL: "" })');
  });

  it("shows and saves an optional WhatsApp number", () => {
    expect(pageSource).toContain("Número de WhatsApp");
    expect(pageSource).toContain("whatsappNumber");
    expect(pageSource).toContain("appUser?.whatsappNumber");
    expect(pageSource).toContain("Es opcional mientras no tengas una tienda");
    expect(pageSource).toContain("saveProfilePatch");
  });
});
