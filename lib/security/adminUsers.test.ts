import { describe, expect, it } from "vitest";

import {
  parseAdminRoleChange,
  parseAdminTrustChange,
} from "./adminUsers";

describe("parseAdminTrustChange", () => {
  it("allows administrators to revoke confirmation", () => {
    expect(parseAdminTrustChange({ status: "revoked" })).toBe("revoked");
  });

  it("does not allow administrators to bypass the two-endorsement rule", () => {
    expect(() => parseAdminTrustChange({ status: "verified" })).toThrow(
      "La confirmación de alumno se obtiene únicamente con 2 avales.",
    );
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
