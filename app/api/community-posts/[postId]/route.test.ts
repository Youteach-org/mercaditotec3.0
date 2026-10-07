import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const routeSource = readFileSync(join(currentDirectory, "route.ts"), "utf8");

describe("community post resolution route security", () => {
  it("requires an unblocked user and only permits resolved status", () => {
    expect(routeSource).toContain("requireUnblockedUser");
    expect(routeSource).toContain('status !== "resolved"');
    expect(routeSource).toContain("resolveCommunityPost(user.uid");
  });
});
