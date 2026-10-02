import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "supabase.ts"), "utf8");

describe("Supabase project configuration", () => {
  it("targets the controlled Mercadito Supabase project", () => {
    expect(source).toContain("wfmokinfcypfpdisussw.supabase.co");
    expect(source).not.toContain("syvfxcqceyijofkgxviu.supabase.co");
  });

  it("uses Firebase ID tokens for authenticated Supabase requests", () => {
    expect(source).toContain("accessToken");
    expect(source).toContain("auth.currentUser?.getIdToken");
  });
});
