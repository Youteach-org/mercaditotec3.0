import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(relative: string) {
  return readFileSync(new URL(relative, import.meta.url), "utf8");
}

describe("MercaditoTec branded email action links", () => {
  it("uses only the real secure app domain for both continue destinations", () => {
    const settings = source("./emailAction.ts");
    expect(settings).toContain('export const EMAIL_ACTION_URL = "https://mercaditotec.store/auth/action"');
    expect(settings).toContain('url: "https://mercaditotec.store/verify-email"');
    expect(settings).toContain('url: "https://mercaditotec.store/login"');
    expect(settings.match(/handleCodeInApp: false/g)).toHaveLength(2);
  });

  it("adds authorized continue URLs for initial verification and resend", () => {
    const register = source("../../app/register/page.tsx");
    const login = source("../../app/login/page.tsx");
    expect(register).toContain("sendEmailVerification(result.user, verificationActionSettings)");
    expect(login.match(/sendEmailVerification\(result\.user, verificationActionSettings\)/g)).toHaveLength(2);
    expect(login).toContain("sendPasswordResetEmail(auth, fullEmail, passwordResetActionSettings)");
  });

  it("actually verifies the one-time Firebase code on the branded route", () => {
    const page = source("../../app/auth/action/page.tsx");
    expect(page).toContain('params.get("mode")');
    expect(page).toContain('params.get("oobCode")');
    expect(page).toContain('applyActionCode(auth, code)');
    expect(page).toContain('verifyPasswordResetCode(auth, code)');
    expect(page).toContain('confirmPasswordReset(auth, code, password)');
    expect(page).toContain('mode === "verifyEmail"');
    expect(page).toContain('mode === "recoverEmail"');
    expect(page).toContain('<Suspense fallback=');
    expect(page).toContain('href="/login"');
    expect(page).not.toContain("window.location.href = continueUrl");
  });
});
