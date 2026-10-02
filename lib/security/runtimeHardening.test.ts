import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("production runtime hardening", () => {
  it("does not expose diagnostic body samples, console captures or secret state", () => {
    const source = readFileSync(join(root, "cloudflare-runtime-entry.mjs"), "utf8");
    expect(source).not.toContain("probeOpenNext");
    expect(source).not.toContain("bodySample");
    expect(source).not.toContain("capturedConsole");
    expect(source).not.toContain("firebaseSecretPresent");
    expect(source).toContain('url.pathname === "/__probe"');
    expect(source).toContain("status: 404");
    expect(source).toContain("Internal Server Error");
  });

  it("ships baseline browser security headers", () => {
    const source = readFileSync(join(root, "next.config.js"), "utf8");
    expect(source).toContain("X-Content-Type-Options");
    expect(source).toContain("X-Frame-Options");
    expect(source).toContain("Referrer-Policy");
    expect(source).toContain("Permissions-Policy");
    expect(source).toContain("Content-Security-Policy");
  });
});
