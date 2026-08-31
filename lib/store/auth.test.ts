import { describe, expect, it } from "vitest";
import { isAdminProfile } from "./auth";


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
