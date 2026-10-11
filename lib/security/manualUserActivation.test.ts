import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseManualRegistration, parseActivationInput } from "./manualUserActivation";

describe("manual registration validation", () => {
  it("requires a Superadmin identity check and normalizes institutional address", () => {
    expect(parseManualRegistration({
      email: " A22121079@MORELIA.TECNM.MX ", displayName: " María   López ",
      identityChecked: true,
    })).toEqual({ email: "a22121079@morelia.tecnm.mx", localPart: "a22121079",
      displayName: "María López" });
  });
  it.each([
    "a22121079@example.com", "admin@morelia.tecnm.mx",
    "a17121079@morelia.tecnm.mx", "a27121079@morelia.tecnm.mx",
  ])("rejects invalid institutional addresses: %s", email => {
    expect(() => parseManualRegistration({ email, displayName: "Luis Pérez",
      identityChecked: true })).toThrow();
  });
  it("does not permit role, endorsements or email verification overrides", () => {
    for (const key of ["role", "studentStatus", "emailVerified", "isAdmin",
      "studentEndorsementCount", "manualIdentityVerifiedAt"]) {
      expect(() => parseManualRegistration({
        email: "a22121079@morelia.tecnm.mx", displayName: "Luis Pérez",
        identityChecked: true, [key]: "superadmin",
      })).toThrow();
    }
    expect(() => parseManualRegistration({
      email: "a22121079@morelia.tecnm.mx", displayName: "Luis Pérez",
    })).toThrow("Confirma que comprobaste");
  });
});

describe("activation constraints", () => {
  it("rejects a short password and guessed codes", () => {
    expect(() => parseActivationInput({
      email: "a22121079@morelia.tecnm.mx", code: "guessed",
      password: "foo",
    })).toThrow();
  });
  it("keeps authorization server-sided and registration under Superadmin", () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
    const adminRoute = readFileSync(join(root, "app/api/admin/users/register/route.ts"), "utf8");
    expect(adminRoute).toContain("requireSuperadmin(request)");
    expect(adminRoute.indexOf("requireSuperadmin(request)")).toBeLessThan(adminRoute.indexOf("request.text()"));
    const source = readFileSync(join(root, "lib/security/manualUserActivation.ts"), "utf8");
    expect(source).toContain('role: "user"');
    expect(source).toContain('studentStatus: "pending"');
    expect(source).toContain("studentEndorsementCount: 0");
    expect(source).toContain("manualActivationAttempts");
    expect(source).toContain("MAX_ATTEMPTS");
    expect(source).not.toContain('emailVerified: true');
    // Preexisting self registrations must not be silently converted.
    expect(source).not.toContain("existingIdentity");
    expect(source).not.toContain("manualConvertedFromSelfRegistration");
    expect(source).not.toContain('lookupFirebaseAccount({ email: data.email })');
    expect(source).toContain('data.registrationSource !== "manual_admin"');
    expect(source).toContain("const uid = await createFirebaseUser(data);");
  });
});
