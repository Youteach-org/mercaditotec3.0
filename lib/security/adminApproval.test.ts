import { describe, expect, it } from "vitest";
import {
  isStudentApprovalEligible,
  isStudentPendingApproval,
} from "./domain";

const pending = { email: "v22123456@morelia.tecnm.mx", studentStatus: "pending" };

describe("approval queue eligibility", () => {
  it("does not put newly registered but unverified accounts into the approval queue", () => {
    expect(isStudentApprovalEligible({ ...pending, emailVerified: false })).toBe(false);
    expect(isStudentPendingApproval({ ...pending, emailVerified: false })).toBe(false);
    expect(isStudentPendingApproval({ ...pending })).toBe(false);
  });

  it("adds students after their email verification is synchronized", () => {
    expect(isStudentPendingApproval({ ...pending, emailVerified: true })).toBe(true);
  });

  it("does not put approved or revoked users back into the pending queue", () => {
    for (const studentStatus of ["verified", "revoked"]) {
      expect(isStudentPendingApproval({ ...pending, studentStatus, emailVerified: true })).toBe(false);
    }
  });

  it("preserves the existing supervised manual activation pathway", () => {
    const base = {
      ...pending, emailVerified: false, registrationSource: "manual_admin",
      createdByAdminUid: "trusted-admin", manualIdentityVerifiedBy: "trusted-admin",
      manualIdentityVerifiedAt: "2026-10-25", manualActivationStatus: "activated",
    };
    expect(isStudentPendingApproval(base)).toBe(true);
    expect(isStudentPendingApproval({ ...base, manualActivationStatus: "pending" })).toBe(false);
    expect(isStudentPendingApproval({ ...base, manualIdentityVerifiedBy: "" })).toBe(false);
  });

  it("does not accept fake manual flags attached to a public registration", () => {
    const forged = { ...pending, emailVerified: false, manualActivationStatus: "activated" };
    expect(isStudentPendingApproval(forged)).toBe(false);
  });
});
