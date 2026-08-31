import { describe, expect, it } from "vitest";

import {
  normalizeInstitutionalEmail,
  nextStudentTrustState,
} from "./trustRepository";

describe("normalizeInstitutionalEmail", () => {
  it("normalizes valid Tec email addresses", () => {
    expect(normalizeInstitutionalEmail("  A12345@MORELIA.TECNM.MX ")).toBe(
      "a12345@morelia.tecnm.mx",
    );
  });

  it("rejects addresses outside the institutional domain", () => {
    expect(() => normalizeInstitutionalEmail("person@gmail.com")).toThrow(
      "Debes indicar un correo institucional válido.",
    );
  });
});

describe("nextStudentTrustState", () => {
  it("keeps one endorsement pending", () => {
    expect(nextStudentTrustState(0)).toEqual({
      count: 1,
      status: "pending",
    });
  });

  it("verifies the student on the second endorsement", () => {
    expect(nextStudentTrustState(1)).toEqual({
      count: 2,
      status: "verified",
    });
  });
});
