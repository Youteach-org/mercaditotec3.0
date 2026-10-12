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
    expect(register).toContain("ESCRIBE LA PARTE DE TU CORREO QUE VA ANTES DE");
    expect(register).toContain("EL DOMINIO SE AGREGA AUTOMÁTICAMENTE.");
    expect(register).toContain("DEBES USAR TU CORREO INSTITUCIONAL DEL TEC DE MORELIA");
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


describe("registration email and password clarity", () => {
  it("shows uppercase red institutional email instructions with no numeric placeholder", () => {
    expect(register).toContain("font-black uppercase");
    expect(register).toContain("text-red-700");
    expect(register).toContain('placeholder="Correo"');
    expect(register).not.toContain('placeholder="a22121079"');
  });
  it("displays a visible password reminder independent of email password", () => {
    expect(register).toContain("NO ES NECESARIA TU CONTRASEÑA DEL CORREO, SINO UNA CONTRASEÑA QUE RECUERDES.");
    expect(register).toContain('role="note"');
  });
});
