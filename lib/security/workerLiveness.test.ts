import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const worker = readFileSync("cloudflare-runtime-entry.mjs", "utf8");
const deploy = readFileSync(".github/workflows/cloudflare-production-deploy.yml", "utf8");

describe("lightweight Worker health checks", () => {
  it("answers /__live before the OpenNext/Firebase rules path", () => {
    const live = worker.indexOf('if (url.pathname === "/__live")');
    const expensive = worker.indexOf('if (url.pathname === "/__health")');
    expect(live).toBeGreaterThan(0);
    expect(live).toBeLessThan(expensive);
    const fast = worker.slice(live, expensive);
    expect(fast).not.toContain("getHandler()");
    expect(fast).not.toContain("firebase-rules-sync");
    expect(fast).not.toContain("await ");
    expect(fast).toContain('live: true');
    expect(fast).toContain("status: 405");
    expect(fast).toContain("status: 204");
  });

  it("keeps the previous privileged rules verification at deploy time", () => {
    expect(worker).toContain('"/api/internal/firebase-rules-sync"');
    expect(worker).toContain("sync-failed");
    expect(deploy).toContain('$BASE/__health');
    expect(deploy).toContain('$BASE/__live');
  });

  it("logs only sampled route families without credentials, IDs or bodies", () => {
    expect(worker).toContain('SLOW_API_WALL_TIME');
    expect(worker).toContain('slice(0, 3).join("/")');
    expect(worker).not.toContain("console.log(request.headers)");
  });
});
