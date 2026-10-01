import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(join(currentDirectory, "page.tsx"), "utf8");

describe("Admin users card role actions", () => {
  it("reveals subadmin promotion only after selecting an ordinary user card", () => {
    expect(pageSource).toContain("selectedUserUid");
    expect(pageSource).toContain("setSelectedUserUid");
    expect(pageSource).toContain("Hacer Subadmin");
    expect(pageSource).toContain('updateRole(user, "subadmin")');
    expect(pageSource).toContain("selectedUserUid === user.uid");
  });

  it("keeps the action for removing an existing subadmin", () => {
    expect(pageSource).toContain("Quitar Subadmin");
    expect(pageSource).toContain('updateRole(user, "user")');
  });
});
