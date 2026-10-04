import { describe, expect, it } from "vitest";
import * as authModule from "./auth";
import { assertUserMayMutate, isAdminProfile } from "./auth";


describe("isAdminProfile", () => {
  it("recognizes legacy admin profiles", () => {
    expect(isAdminProfile({ role: "admin" })).toBe(true);
    expect(isAdminProfile({ role: "administrator" })).toBe(true);
    expect(isAdminProfile({ isAdmin: true })).toBe(true);
    expect(isAdminProfile({ admin: true })).toBe(true);
  });

  it("recognizes the new superadmin and subadmin roles", () => {
    expect(isAdminProfile({ role: "superadmin" })).toBe(true);
    expect(isAdminProfile({ role: "subadmin" })).toBe(true);
  });

  it("rejects ordinary users", () => {
    expect(isAdminProfile({ role: "user" })).toBe(false);
    expect(isAdminProfile({})).toBe(false);
    expect(isAdminProfile(null)).toBe(false);
  });
});

describe("administrative blocks", () => {
  it("rejects mutations while a temporary block is active", () => {
    expect(() => assertUserMayMutate({
      blocked: true,
      blockedUntil: "2026-09-03T12:00:00.000Z",
    }, new Date("2026-09-02T12:00:00.000Z"))).toThrow(
      "Tu cuenta está bloqueada temporalmente",
    );
  });

  it("allows mutations after the block expires", () => {
    expect(() => assertUserMayMutate({
      blocked: true,
      blockedUntil: "2026-09-01T12:00:00.000Z",
    }, new Date("2026-09-02T12:00:00.000Z"))).not.toThrow();
  });
});


describe("student entry authorization", () => {
  function assertEntry() {
    const candidate = (authModule as Record<string, unknown>).assertStudentMayEnter;
    expect(candidate).toBeTypeOf("function");
    return candidate as (
      profile: Record<string, unknown> | undefined,
      claims: Record<string, unknown>,
      now?: Date,
    ) => void;
  }

  it("allows an eligible verified student", () => {
    const assertMayEnter = assertEntry();
    expect(() => assertMayEnter(
      { role: "user" },
      { email: "a22121079@morelia.tecnm.mx", email_verified: true },
      new Date("2026-10-01T12:00:00Z"),
    )).not.toThrow();
  });

  it("rejects an ordinary user outside the five-year control window", () => {
    const assertMayEnter = assertEntry();
    expect(() => assertMayEnter(
      { role: "user" },
      { email: "a20123456@morelia.tecnm.mx", email_verified: true },
      new Date("2026-10-01T12:00:00Z"),
    )).toThrow("últimos 5 años");
  });

  it("allows an existing admin with verified institutional email even without a student control format", () => {
    const assertMayEnter = assertEntry();
    expect(() => assertMayEnter(
      { role: "superadmin" },
      { email: "administracion@morelia.tecnm.mx", email_verified: true },
      new Date("2026-10-01T12:00:00Z"),
    )).not.toThrow();
  });

  it("does not accept a mutable Firestore emailVerified mirror", () => {
    const assertMayEnter = assertEntry();
    expect(() => assertMayEnter(
      { role: "user", emailVerified: true },
      { email: "a22121079@morelia.tecnm.mx", email_verified: false },
      new Date("2026-10-01T12:00:00Z"),
    )).toThrow("verificar tu correo");
  });

  it("does not let an admin bypass the institutional domain", () => {
    const assertMayEnter = assertEntry();
    expect(() => assertMayEnter(
      { role: "superadmin" },
      { email: "admin@example.com", email_verified: true },
      new Date("2026-10-01T12:00:00Z"),
    )).toThrow("@morelia.tecnm.mx");
  });
});
