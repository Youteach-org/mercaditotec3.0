import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const marketplace = readFileSync(join(here, "page.tsx"), "utf8");
const storePage = readFileSync(join(here, "stores", "[slug]", "page.tsx"), "utf8");
const api = readFileSync(join(here, "..", "api", "marketplace", "stores", "[slug]", "route.ts"), "utf8");

describe("guest marketplace access", () => {
  it("keeps catalog visible but directs guest store visits to login", () => {
    expect(marketplace).toContain('href={requiresLogin ? "/login" : storeHref}');
    expect(marketplace).toContain('requiresLogin={!firebaseUser || sessionLoading}');
  });
  it("never displays community notices without a resolved signed-in user", () => {
    expect(marketplace).toContain("!sessionLoading && firebaseUser && (");
    expect(marketplace).toContain("<QuickNoticesPanel");
  });
  it("does not request store data before authentication", () => {
    expect(storePage).toContain("if (sessionLoading) return;");
    expect(storePage).toContain('router.replace("/login")');
    expect(storePage).toContain("firebaseUser.getIdToken()");
  });
  it("requires verified auth on the detail API and prevents public cache leakage", () => {
    expect(api).toContain("await requireFirebaseUser(request)");
    expect(api).toContain('"Cache-Control": "private, no-store"');
  });
});
