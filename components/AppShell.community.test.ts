import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const shellSource = readFileSync(join(currentDirectory, "AppShell.tsx"), "utf8");

describe("Lost and found navigation", () => {
  it("adds Cosas perdidas to the authenticated navigation", () => {
    expect(shellSource).toContain('/cosas-perdidas');
    expect(shellSource).toContain("Cosas perdidas");
  });
});
