import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const register = readFileSync(join(here, "page.tsx"), "utf8");
const login = readFileSync(join(here, "..", "login", "page.tsx"), "utf8");

describe("institutional email field on narrow screens", () => {
  it("shows the full institutional domain below the username on mobile registration", () => {
    expect(register).toContain("grid grid-cols-1 overflow-hidden");
    expect(register).toContain("sm:grid-cols-[minmax(0,1fr)_auto]");
    expect(register).toContain("whitespace-nowrap");
    expect(register).toContain("sm:border-l sm:border-t-0");
    expect(register).toContain("Tu correo completo será:");
  });

  it("explains exactly what the student should type during registration", () => {
    expect(register).toContain("Escribe solamente lo que va antes de");
    expect(register).toContain("No escribas el dominio.");
    expect(register).toContain("Usa tu correo institucional del Tec de Morelia.");
    expect(register).toContain("¿Ya tienes cuenta? Inicia sesión");
  });

  it("keeps login consistent so the institutional address is not ambiguous", () => {
    expect(login).toContain("grid grid-cols-1 overflow-hidden");
    expect(login).toContain("sm:grid-cols-[minmax(0,1fr)_auto]");
    expect(login).toContain("se agrega automáticamente");
    expect(login).toContain("Correo completo:");
  });

  it("does not change the required institutional domain", () => {
    expect(register).toContain('const DOMAIN = "@morelia.tecnm.mx"');
    expect(login).toContain('const DOMAIN = "@morelia.tecnm.mx"');
  });
});
