import { describe, expect, it } from "vitest";
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
