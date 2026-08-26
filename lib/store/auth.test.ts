import { describe, expect, it } from "vitest";
import { isAdminProfile } from "./auth";

describe("isAdminProfile", () => {
  it("reconoce role admin", () => {
    expect(isAdminProfile({ role: "admin" })).toBe(true);
  });

  it("reconoce role administrator", () => {
    expect(isAdminProfile({ role: "administrator" })).toBe(true);
  });

  it("reconoce isAdmin true", () => {
    expect(isAdminProfile({ isAdmin: true })).toBe(true);
  });

  it("reconoce admin true", () => {
    expect(isAdminProfile({ admin: true })).toBe(true);
  });

  it("rechaza usuarios normales", () => {
    expect(isAdminProfile({ role: "user" })).toBe(false);
    expect(isAdminProfile({})).toBe(false);
    expect(isAdminProfile(null)).toBe(false);
  });
});
