import { describe, expect, it } from "vitest";

import {
  parseAdminRoleChange,
  parseAdminTrustChange,
} from "./adminUsers";

describe("parseAdminTrustChange", () => {
  it("accepts verify and revoke", () => {
    expect(parseAdminTrustChange({ status: "verified" })).toBe("verified");
    expect(parseAdminTrustChange({ status: "revoked" })).toBe("revoked");
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
