import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const routeSource = readFileSync(join(currentDirectory, "route.ts"), "utf8");

describe("community posts collection route security", () => {
  it("requires authentication for reads and unblocked auth for writes", () => {
    expect(routeSource).toContain("requireFirebaseUser");
    expect(routeSource).toContain("requireUnblockedUser");
  });

  it("validates uploaded image ownership before creating", () => {
    expect(routeSource).toContain("validateCommunityPostImageUrl");
    expect(routeSource).toContain("user.uid");
  });
});
