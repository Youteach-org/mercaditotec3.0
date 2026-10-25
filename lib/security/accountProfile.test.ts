import { describe, expect, it } from "vitest";

import {
  AccountProfileError,
  accountIdentityChanges,
  buildOwnProfileUpdate,
  institutionalIdentity,
} from "./accountProfile";

describe("institutionalIdentity", () => {
  it("derives the control number from the institutional address", () => {
    expect(
      institutionalIdentity("a22121079@morelia.tecnm.mx", {
        requireStudentControl: true,
        now: new Date("2026-10-02T12:00:00Z"),
      }),
    ).toEqual({
      email: "a22121079@morelia.tecnm.mx",
      localPart: "a22121079",
      controlNumber: "22121079",
      entryYear: 2022,
    });
  });

  it("rejects non-institutional domains", () => {
    expect(() =>
      institutionalIdentity("a22121079@example.com", {
        requireStudentControl: true,
        now: new Date("2026-10-02T12:00:00Z"),
      }),
    ).toThrow(AccountProfileError);
  });

  it("lets an established admin skip only the control format", () => {
    expect(
      institutionalIdentity("administracion@morelia.tecnm.mx", {
        requireStudentControl: false,
      }),
    ).toEqual({
      email: "administracion@morelia.tecnm.mx",
      localPart: "administracion",
    });
  });
});


describe("buildOwnProfileUpdate WhatsApp", () => {
  const now = new Date("2026-10-07T12:00:00Z");

  it("normalizes WhatsApp when updating the profile", () => {
    expect(
      buildOwnProfileUpdate({ whatsappNumber: "(443) 123-4567" }, now),
    ).toMatchObject({
      whatsappNumber: "+524431234567",
    });
  });

  it("allows clearing WhatsApp", () => {
    expect(buildOwnProfileUpdate({ whatsappNumber: "" }, now)).toMatchObject({
      whatsappNumber: "",
    });
  });

  it("rejects invalid WhatsApp", () => {
    expect(() =>
      buildOwnProfileUpdate({ whatsappNumber: "123" }, now),
    ).toThrow(AccountProfileError);
  });
});

describe("immutable account identity", () => {
  it("rejects attempts to change the institutional email, roles or verification", () => {
    for (const input of [
      { email: "nuevo@morelia.tecnm.mx" },
      { emailVerified: true },
      { role: "superadmin" },
      { nickname: "not-via-profile-patch" },
    ]) {
      expect(() => buildOwnProfileUpdate(input)).toThrow(AccountProfileError);
    }
  });
});

describe("avoid unnecessary Firestore profile writes", () => {
  const identity = { email: "a22121079@morelia.tecnm.mx", localPart: "a22121079" };

  it("skips existing verified users when nothing has changed", () => {
    expect(accountIdentityChanges({
      email: identity.email,
      emailLocalPart: identity.localPart,
      emailVerified: true,
      role: "user",
    }, identity, true)).toBeNull();
  });

  it("updates only changed fields when the email verification changes", () => {
    expect(accountIdentityChanges({
      email: identity.email,
      emailLocalPart: identity.localPart,
      emailVerified: false,
    }, identity, true)).toEqual({ emailVerified: true });
  });

  it("repairs missing or inconsistent institutional identity fields", () => {
    expect(accountIdentityChanges({ emailVerified: true }, identity, true)).toEqual({
      email: identity.email,
      emailLocalPart: identity.localPart,
    });
  });

  it("does not update verification during an already bootstrapped nickname flow", () => {
    expect(accountIdentityChanges({
      email: identity.email,
      emailLocalPart: identity.localPart,
      emailVerified: false,
    }, identity)).toBeNull();
  });

  it("preserves the original unverified-token behavior for manually activated profiles", () => {
    expect(accountIdentityChanges({
      email: identity.email,
      emailLocalPart: identity.localPart,
      emailVerified: true,
    }, identity, false)).toEqual({ emailVerified: false });
  });
});
