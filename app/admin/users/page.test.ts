import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(join(currentDirectory, "page.tsx"), "utf8");

describe("Admin users card actions", () => {
  it("keeps actions collapsed until a user card is selected", () => {
    expect(pageSource).toContain("selectedUserUid");
    expect(pageSource).toContain("const canExpand = !isSelf");
    expect(pageSource).toContain("{selected && (");
  });

  it("keeps superadmin-only approval and deletion controls protected", () => {
    expect(pageSource).toContain("Aprobar manualmente");
    expect(pageSource).toContain("isSuperadmin &&");
    expect(pageSource).toContain("Eliminar usuario");
    expect(pageSource).toContain("canDelete");
    expect(pageSource).toContain("window.confirm");
    expect(pageSource).toContain('method: "DELETE"');
  });

  it("opens a personal chat from the selected user card", () => {
    expect(pageSource).toContain("Abrir chat privado");
    expect(pageSource).toContain("/chat/personal/");
  });

  it("keeps username search and subadmin controls", () => {
    expect(pageSource).toContain("Buscar usuario, correo, nombre o ID");
    expect(pageSource).toContain("Usuario:");
    expect(pageSource).toContain("Hacer Subadmin");
    expect(pageSource).toContain("Quitar Subadmin");
  });
});
