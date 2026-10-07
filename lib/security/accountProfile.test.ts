import { describe, expect, it } from "vitest";

import {
  AccountProfileError,
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
