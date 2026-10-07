import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "AppShell.tsx"), "utf8");

describe("AppShell admin visibility security", () => {
  it("requires a fresh server-side admin session before rendering Admin", () => {
    expect(source).toContain('"/api/admin/session"');
    expect(source).toContain("serverAdminVerified");
    expect(source).toContain("setServerAdminVerified(false)");
    expect(source).toContain('body.role === "superadmin" || body.role === "subadmin"');
  });

  it("does not derive Admin visibility only from the local profile snapshot", () => {
    expect(source).toContain(
      'const showAdmin = serverAdminVerified && !syncDeferred && Boolean(firebaseUser)',
    );
    expect(source).not.toContain(
      'const showAdmin = isAdminRole(appUser) && !syncDeferred',
    );
  });
});
