import { afterEach, describe, expect, it, vi } from "vitest";
import { CollectionReference, DocumentReference } from "../firestoreRest";
import { assertStudentMayEnter, assertUserMayMutate } from "../store/auth";
import { isAdministrativeBlockActive } from "../moderation/domain";

afterEach(() => vi.unstubAllGlobals());

describe("authorization regressions", () => {
  it("does not borrow a profile email when the verified token has none", () => {
    expect(() => assertStudentMayEnter(
      { email: "a22121079@morelia.tecnm.mx", emailVerified: true },
      { email_verified: true }, new Date("2026-10-02"),
    )).toThrow();
  });
  it("rejects mutations by deactivated accounts", () => {
    expect(() => assertUserMayMutate({ isActive: false })).toThrow();
  });
  it.each([undefined, null, "invalid"])("fails closed for a block without valid expiry: %s", (blockedUntil) => {
    expect(isAdministrativeBlockActive({ blocked: true, blockedUntil })).toBe(true);
  });
});

describe("privileged Firestore path boundary", () => {
  it.each(["../users/victim", "x?mask.fieldPaths=role", "x#fragment", "x%2Fusers", "", "..", "a\\b"])(
    "rejects a document id that can alter the resource: %s", (id) => {
      expect(() => new CollectionReference("users").doc(id)).toThrow();
    },
  );
  it("rejects path traversal in directly constructed references", () => {
    expect(() => new DocumentReference("users/../admin/victim")).toThrow();
  });
  it("supports ordinary and Unicode document ids", () => {
    expect(new CollectionReference("users").doc("alumno-1").path).toBe("users/alumno-1");
    expect(new CollectionReference("store_name_reservations").doc("café").path).toBe("store_name_reservations/café");
  });
});
