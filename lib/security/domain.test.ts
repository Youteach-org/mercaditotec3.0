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

  it("accepts a letter plus an 8-digit control number from the current eight-year window", () => {
    const validate = validator();
    expect(validate("a22121079", new Date("2026-10-01T12:00:00Z"))).toEqual({
      allowed: true,
      controlNumber: "22121079",
      entryYear: 2022,
    });
  });

  it("includes the eight-year boundary", () => {
    const validate = validator();
    expect(validate("x18123456", new Date("2026-10-01T12:00:00Z")).allowed).toBe(true);
  });

  it("rejects control numbers older than eight years", () => {
    const validate = validator();
    const result = validate("a17123456", new Date("2026-10-01T12:00:00Z"));
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("más de 8 años");
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


describe("student application access eligibility", () => {
  function accessValidator() {
    const candidate = (securityDomain as Record<string, unknown>).studentAccessEligibility;
    expect(candidate).toBeTypeOf("function");
    return candidate as (input: {
      email: string;
      emailVerified: boolean;
      profile?: unknown;
      now?: Date;
    }) => { allowed: boolean; reason?: string; adminBypass?: boolean };
  }

  it("allows an ordinary verified institutional student inside the control-year window", () => {
    const validate = accessValidator();
    expect(validate({
      email: "a22121079@morelia.tecnm.mx",
      emailVerified: true,
      profile: { role: "user" },
      now: new Date("2026-10-01T12:00:00Z"),
    }).allowed).toBe(true);
  });

  it("rejects ordinary users whose control year is too old", () => {
    const validate = accessValidator();
    const result = validate({
      email: "a17123456@morelia.tecnm.mx",
      emailVerified: true,
      profile: { role: "user" },
      now: new Date("2026-10-01T12:00:00Z"),
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("más de 8 años");
  });

  it("keeps email verification as a required condition", () => {
    const validate = accessValidator();
    expect(validate({
      email: "a22121079@morelia.tecnm.mx",
      emailVerified: false,
      profile: { role: "user" },
      now: new Date("2026-10-01T12:00:00Z"),
    }).allowed).toBe(false);
  });

  it("lets an existing admin account bypass only the student control-number rule", () => {
    const validate = accessValidator();
    expect(validate({
      email: "administracion@morelia.tecnm.mx",
      emailVerified: true,
      profile: { role: "superadmin" },
      now: new Date("2026-10-01T12:00:00Z"),
    })).toEqual({ allowed: true, adminBypass: true });
  });

  it("does not let an admin bypass the institutional-domain rule", () => {
    const validate = accessValidator();
    expect(validate({
      email: "administracion@example.com",
      emailVerified: true,
      profile: { role: "superadmin" },
      now: new Date("2026-10-01T12:00:00Z"),
    }).allowed).toBe(false);
  });
});


describe("manual in-person activation access", () => {
  const profile = {
    role: "user", email: "a22121079@morelia.tecnm.mx",
    registrationSource: "manual_admin", manualActivationStatus: "activated",
    manualIdentityVerifiedBy: "admin-uid",
    manualIdentityVerifiedAt: { toDate: () => new Date() },
  };

  it("allows manually activated institutional users without email_verified", () => {
    expect(securityDomain.studentAccessEligibility({
      email: profile.email, emailVerified: false, profile,
      now: new Date("2026-10-09"),
    }).allowed).toBe(true);
  });

  it("fails closed when the persisted manual identity attestation is incomplete", () => {
    for (const change of [
      { manualActivationStatus: "pending" },
      { registrationSource: undefined },
      { manualIdentityVerifiedAt: null },
      { manualIdentityVerifiedBy: "" },
      { role: "subadmin" },
      { email: "another@morelia.tecnm.mx" },
    ]) {
      expect(securityDomain.studentAccessEligibility({
        email: "a22121079@morelia.tecnm.mx",
        emailVerified: false,
        profile: { ...profile, ...change },
        now: new Date("2026-10-09"),
      }).allowed).toBe(false);
    }
  });
});
