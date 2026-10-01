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
    const creation = register.indexOf("createUserWithEmailAndPassword");
    expect(validation).toBeGreaterThan(-1);
    expect(creation).toBeGreaterThan(validation);
  });

  it("checks additive student access after Firebase login", () => {
    const login = source("app/login/page.tsx");
    expect(login).toContain("studentAccessEligibility");
    expect(login).toContain("profileData");
    expect(login).toContain("await signOut(auth)");
  });

  it("enforces the same rule in server authentication", () => {
    const auth = source("lib/store/auth.ts");
    expect(auth).toContain("assertStudentMayEnter");
    expect(auth).toContain("studentAccessEligibility");
    expect(auth).toContain("assertStudentMayEnter(profile");
  });
});
