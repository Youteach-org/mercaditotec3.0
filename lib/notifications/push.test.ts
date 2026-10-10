import { describe, expect, it } from "vitest";
import { pushDeviceId, validatePushToken } from "./push";

describe("Push device security", () => {
  it("hashes device tokens for Firestore identities", () => {
    const token = "example-device-token-for-test-only-ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const id = pushDeviceId(token);
    expect(id).toMatch(/^[a-f0-9]{64}$/);
    expect(id).not.toContain(token);
    expect(pushDeviceId(token)).toBe(id);
  });

  it("accepts plausible FCM tokens, rejects malicious and oversized identifiers", () => {
    expect(validatePushToken("abc123:APA91b-example123456789012345678901234567890")).toContain("APA91b");
    for (const invalid of ["short", "bad/../../path", "\n".repeat(100), "z".repeat(5000), null]) {
      expect(() => validatePushToken(invalid)).toThrow();
    }
  });
});
