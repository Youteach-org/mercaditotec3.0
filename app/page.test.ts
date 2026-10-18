import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const home = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const edge = readFileSync(new URL("../cloudflare-runtime-entry.mjs", import.meta.url), "utf8");

describe("Mercadito homepage", () => {
  it("sends authenticated users to Descubre and guests to the approved public Marketplace", () => {
    expect(home).toContain('router.replace(firebaseUser ? "/descubre" : "/marketplace")');
  });

  it("does not force every visitor into stores from the Cloudflare entrypoint", () => {
    expect(edge).not.toContain('location: new URL("/marketplace" + url.search');
    expect(edge).not.toContain('status: 307,\n        headers: {');
  });
});
