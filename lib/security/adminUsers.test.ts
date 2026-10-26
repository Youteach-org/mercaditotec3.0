import { describe, expect, it } from "vitest";

import {
  parseAdminRoleChange,
  parseAdminTrustChange,
  isRegisteredAdminListUser,
} from "./adminUsers";

describe("parseAdminTrustChange", () => {
  it("allows administrators to revoke confirmation", () => {
    expect(parseAdminTrustChange({ status: "revoked" })).toBe("revoked");
  });

  it("accepts manual verification as an explicit administrative action", () => {
    expect(parseAdminTrustChange({ status: "verified" })).toBe("verified");
  });

  it("rejects unsupported trust states", () => {
    expect(() => parseAdminTrustChange({ status: "pending" })).toThrow(
      "Acción de confianza inválida.",
    );
  });
});

describe("parseAdminRoleChange", () => {
  it("only allows assigning or removing subadmin", () => {
    expect(parseAdminRoleChange({ role: "subadmin" })).toBe("subadmin");
    expect(parseAdminRoleChange({ role: "user" })).toBe("user");
  });

  it("does not allow creating superadmins through this action", () => {
    expect(() => parseAdminRoleChange({ role: "superadmin" })).toThrow(
      "Acción de administrador inválida.",
    );
  });
});

describe("admin user list identity gate", () => {
  it("does not treat unverified Firebase signups as users", () => {
    expect(isRegisteredAdminListUser({
      email: "a22121079@morelia.tecnm.mx",
      emailVerified: false,
      studentStatus: "pending",
      isActive: true,
    })).toBe(false);
  });

  it("lists users only after institutional email verification", () => {
    expect(isRegisteredAdminListUser({
      email: "a22121079@morelia.tecnm.mx",
      emailVerified: true,
      studentStatus: "pending",
    })).toBe(true);
  });

  it("preserves the explicitly approved in-person activation exception", () => {
    expect(isRegisteredAdminListUser({
      email: "a22121079@morelia.tecnm.mx",
      emailVerified: false,
      registrationSource: "manual_admin",
      manualActivationStatus: "activated",
      manualIdentityVerifiedBy: "superadmin",
      manualIdentityVerifiedAt: 1,
      createdByAdminUid: "superadmin",
    })).toBe(true);
  });
});
