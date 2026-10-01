import { describe, expect, it } from "vitest";
import * as securityDomain from "./domain";

import {
  canEndorseStudent,
  effectiveAdminRole,
  isAdminRole,
  isSuperadminRole,
  trustPeriodId,
} from "./domain";

describe("administrative roles", () => {
  it("treats legacy admin accounts as superadmin", () => {
    expect(effectiveAdminRole({ role: "admin" })).toBe("superadmin");
    expect(effectiveAdminRole({ role: "administrator" })).toBe("superadmin");
    expect(effectiveAdminRole({ isAdmin: true })).toBe("superadmin");
  });

  it("recognizes explicit superadmin and subadmin", () => {
    expect(effectiveAdminRole({ role: "superadmin" })).toBe("superadmin");
    expect(effectiveAdminRole({ role: "subadmin" })).toBe("subadmin");
    expect(isAdminRole({ role: "subadmin" })).toBe(true);
    expect(isSuperadminRole({ role: "subadmin" })).toBe(false);
    expect(isSuperadminRole({ role: "superadmin" })).toBe(true);
  });

  it("rejects ordinary profiles", () => {
    expect(effectiveAdminRole({ role: "user" })).toBeNull();
    expect(isAdminRole(null)).toBe(false);
  });
});

describe("student trust periods", () => {
  it("splits the year into Jan-Jun and Jul-Dec periods", () => {
    expect(trustPeriodId(new Date("2026-01-15T12:00:00Z"))).toBe("2026-1");
    expect(trustPeriodId(new Date("2026-06-30T12:00:00Z"))).toBe("2026-1");
    expect(trustPeriodId(new Date("2026-07-01T12:00:00Z"))).toBe("2026-2");
    expect(trustPeriodId(new Date("2026-12-31T12:00:00Z"))).toBe("2026-2");
  });
});

describe("student endorsements", () => {
  const base = {
    endorserUid: "student-a",
    targetUid: "student-b",
    endorserStatus: "verified" as const,
    targetStatus: "pending" as const,
    alreadyEndorsed: false,
    endorsementsGivenThisPeriod: 0,
  };

  it("allows a verified student to endorse a pending student", () => {
    expect(canEndorseStudent(base)).toEqual({ allowed: true });
  });

  it("rejects self endorsement", () => {
    expect(canEndorseStudent({ ...base, targetUid: "student-a" })).toEqual({
      allowed: false,
      reason: "No puedes avalarte a ti mismo.",
    });
  });

  it("requires a verified endorser", () => {
    expect(canEndorseStudent({ ...base, endorserStatus: "pending" })).toEqual({
      allowed: false,
      reason: "Solo un alumno confirmado puede avalar a otro alumno.",
    });
  });

  it("does not allow duplicate endorsements", () => {
    expect(canEndorseStudent({ ...base, alreadyEndorsed: true })).toEqual({
      allowed: false,
      reason: "Ya avalaste a este alumno.",
    });
  });

  it("limits each student to five endorsements per period", () => {
    expect(canEndorseStudent({ ...base, endorsementsGivenThisPeriod: 5 })).toEqual({
      allowed: false,
      reason: "Ya utilizaste tus 5 avales disponibles en este periodo.",
    });
  });

  it("only accepts pending targets", () => {
    expect(canEndorseStudent({ ...base, targetStatus: "verified" })).toEqual({
      allowed: false,
      reason: "Este alumno ya está confirmado.",
    });
    expect(canEndorseStudent({ ...base, targetStatus: "revoked" })).toEqual({
      allowed: false,
      reason: "Esta cuenta requiere revisión administrativa antes de poder confirmarse.",
    });
  });
});


describe("student control number eligibility", () => {
  function validator() {
    const candidate = (securityDomain as Record<string, unknown>).studentControlEligibility;
    expect(candidate).toBeTypeOf("function");
    return candidate as (value: string, now?: Date) => {
      allowed: boolean;
      controlNumber?: string;
      entryYear?: number;
      reason?: string;
    };
  }

  it("accepts a letter plus an 8-digit control number from the current five-year window", () => {
    const validate = validator();
    expect(validate("a22121079", new Date("2026-10-01T12:00:00Z"))).toEqual({
      allowed: true,
      controlNumber: "22121079",
      entryYear: 2022,
    });
  });

  it("includes the five-year boundary", () => {
    const validate = validator();
    expect(validate("x21123456", new Date("2026-10-01T12:00:00Z")).allowed).toBe(true);
  });

  it("rejects control numbers older than five years", () => {
    const validate = validator();
    const result = validate("a20123456", new Date("2026-10-01T12:00:00Z"));
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("últimos 5 años");
  });

  it("rejects future entry years", () => {
    const validate = validator();
    expect(validate("a27123456", new Date("2026-10-01T12:00:00Z")).allowed).toBe(false);
  });

  it("rejects identifiers that are not letters followed by exactly eight digits", () => {
    const validate = validator();
    expect(validate("22121079", new Date("2026-10-01T12:00:00Z")).allowed).toBe(false);
    expect(validate("alumno22", new Date("2026-10-01T12:00:00Z")).allowed).toBe(false);
  });
});
