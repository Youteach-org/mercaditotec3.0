import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

function source(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("student access wiring", () => {
  it("validates the control number before registration creates a Firebase account", () => {
    const register = source("app/register/page.tsx");
    const validation = register.indexOf("studentControlEligibility(cleanLocalPart");
    const creation = register.indexOf("const result = await createUserWithEmailAndPassword");
    expect(validation).toBeGreaterThan(-1);
    expect(creation).toBeGreaterThan(validation);
  });

  it("checks student access through the authenticated server sync after Firebase login", () => {
    const login = source("app/login/page.tsx");
    expect(login).toContain("/api/account/sync");
    expect(login).toContain("getIdToken(true)");
    expect(login).toContain("await signOut(auth)");
    expect(login).not.toContain("studentAccessEligibility");
    expect(login).not.toContain("profileData");
  });

  it("enforces the same rule in server authentication", () => {
    const auth = source("lib/store/auth.ts");
    expect(auth).toContain("assertStudentMayEnter");
    expect(auth).toContain("studentAccessEligibility");
    expect(auth).toMatch(/assertStudentMayEnter\(\s*profile,/);
    expect(auth).toContain("claims.email_verified === true");
    expect(auth).not.toContain("profile?.emailVerified === true");
  });

  it("does not write privileged user fields directly from registration, login or profile UI", () => {
    for (const path of ["app/register/page.tsx", "app/login/page.tsx", "app/profile/page.tsx"]) {
      const code = source(path);
      expect(code).not.toMatch(/setDoc\(\s*doc\(db,\s*["']users["']/);
      expect(code).not.toMatch(/updateDoc\(\s*doc\(db,\s*["']users["']/);
    }

    expect(source("app/register/page.tsx")).toContain("/api/account/bootstrap");
    expect(source("app/login/page.tsx")).toContain("/api/account/sync");
    expect(source("app/profile/page.tsx")).toContain("/api/profile");
  });
});
