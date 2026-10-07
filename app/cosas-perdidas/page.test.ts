import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(join(currentDirectory, "page.tsx"), "utf8");

describe("Lost and found page", () => {
  it("is protected and loads only found-item posts", () => {
    expect(pageSource).toContain("AuthGuard");
    expect(pageSource).toContain('type: "found_item"');
    expect(pageSource).toContain("loadCommunityPosts");
  });

  it("requires and uploads an owner-bound photo", () => {
    expect(pageSource).toContain("validateMediaFileMeta");
    expect(pageSource).toContain("buildCommunityPostMediaPath");
    expect(pageSource).toContain("uploadImageFile");
    expect(pageSource).toContain("firebaseUser.uid");
    expect(pageSource).toContain('type="file"');
  });

  it("lets only the author render the resolve action", () => {
    expect(pageSource).toContain("post.authorUid === firebaseUser.uid");
    expect(pageSource).toContain("Marcar como entregado");
    expect(pageSource).toContain("resolveCommunityPostRequest");
  });
});
