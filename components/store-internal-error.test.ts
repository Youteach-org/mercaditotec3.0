import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "store", "StoreBuilderClient.tsx"), "utf8");

describe("store submit errors", () => {
  it("does not surface the raw generic internal error to users", () => {
    expect(source).toContain("friendlyStoreStepError");
    expect(source).toContain("No se pudo guardar la información de la tienda.");
    expect(source).toContain("No se pudo guardar el horario de la tienda.");
    expect(source).toContain("No se pudo enviar la tienda a revisión.");
  });
});
