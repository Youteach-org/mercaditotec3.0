import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(join(here, "page.tsx"), "utf8");
const bootstrapSource = readFileSync(
  join(here, "..", "api", "account", "bootstrap", "route.ts"),
  "utf8",
);

describe("registration nickname requirement", () => {
  it("requires a nickname before creating the account", () => {
    expect(pageSource).toContain("Nickname");
    expect(pageSource).toContain("required");
    expect(pageSource).toContain("validateNicknameSyntax");
    expect(pageSource).toContain("/api/account/nickname");
  });

  it("sends the nickname into account bootstrap", () => {
    expect(pageSource).toContain('body: JSON.stringify({ nickname: parsedNickname.nickname })');
    expect(bootstrapSource).toContain('const nickname = String(');
    expect(bootstrapSource).toContain("bootstrapAccountProfile(claims, nickname)");
  });

  it("removes a just-created Firebase account if bootstrap fails", () => {
    expect(pageSource).toContain("await deleteUser(result.user)");
  });
});
