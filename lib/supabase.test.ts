import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "supabase.ts"), "utf8");

describe("Supabase image-only configuration", () => {
  it("targets the controlled Supabase storage project", () => {
    expect(source).toContain("wfmokinfcypfpdisussw.supabase.co");
    expect(source).not.toContain("syvfxcqceyijofkgxviu.supabase.co");
  });

  it("contains only storage/function configuration, not a database client", () => {
    expect(source).toContain('SUPABASE_IMAGE_BUCKET');
    expect(source).toContain('SUPABASE_IMAGE_UPLOAD_ENDPOINT');
    expect(source).not.toContain("createClient");
    expect(source).not.toContain("accessToken");
  });
});
