import { describe, expect, it } from "vitest";

import {
  AccountProfileError,
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
