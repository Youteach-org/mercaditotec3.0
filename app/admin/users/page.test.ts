import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(join(currentDirectory, "page.tsx"), "utf8");

describe("Admin users card role actions", () => {
  it("does not offer promoting a student to subadmin from the user card", () => {
    expect(pageSource).not.toContain("Hacer Subadmin");
    expect(pageSource).not.toContain('updateRole(user, "subadmin")');
  });

  it("keeps the action for removing an existing subadmin", () => {
    expect(pageSource).toContain("Quitar Subadmin");
    expect(pageSource).toContain('updateRole(user, "user")');
  });
});
