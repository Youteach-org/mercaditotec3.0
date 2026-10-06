import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const chatSource = readFileSync(join(here, "page.tsx"), "utf8");
const routeSource = readFileSync(
  join(here, "..", "api", "nickname", "route.ts"),
  "utf8",
);

describe("account-wide nickname persistence", () => {
  it("loads nickname from the account before deciding whether to prompt", () => {
    expect(chatSource).toContain("nicknameResolved");
    expect(chatSource).toContain('moderationApiFetch(firebaseUser, "/api/nickname"');
    expect(chatSource).toContain("!nicknameResolved");
    expect(chatSource).toContain("Cargando tu nickname...");
  });

  it("reads users as the primary nickname source", () => {
    expect(routeSource).toContain('db.collection("users").doc(uid).get()');
    expect(routeSource).toContain('db.collection("public_profiles").doc(uid).get()');
    expect(routeSource).toContain("if (userNickname) return userNickname");
  });

  it("checks and atomically reserves uniqueness before assigning", () => {
    expect(routeSource).toContain('collection("nicknames").doc(normalized)');
    expect(routeSource).toContain('where("nicknameNormalized", "==", normalized)');
    expect(routeSource).toContain("NICKNAME_TAKEN");
    expect(routeSource).toContain("Ese nickname ya está siendo usado por otra persona.");
  });

  it("uses the same shared nickname syntax as registration", () => {
    expect(routeSource).toContain("validateNicknameSyntax");
    expect(chatSource).toContain("validateNicknameSyntax");
    expect(chatSource).toContain("3–24 caracteres");
  });
});
