import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseTrafficAnalytics } from "./traffic";

describe("low-cost recent visitor diagnostics", () => {
  it("keeps unique IPs per minute separate rather than summing them as people", () => {
    const result = parseTrafficAnalytics({
      data: { viewer: { zones: [{
        recent: [
          { dimensions: { datetimeMinute: "2026-10-10T21:01:00Z" },
            uniq: { uniques: 3 }, sum: { requests: 41, pageViews: 2 } },
          { dimensions: { datetimeMinute: "2026-10-10T21:00:00Z" },
            uniq: { uniques: 2 }, sum: { requests: 50, pageViews: 1 } },
        ],
        topPaths: [
          { count: 6, avg: { sampleInterval: 2 }, dimensions: { clientRequestPath: "/api/chat" } },
          { count: 4, avg: { sampleInterval: 1 }, dimensions: { clientRequestPath: "/marketplace" } },
        ],
      }] } },
    });
    expect(result.status).toBe("available");
    expect(result.latestMinute).toBe("2026-10-10T21:01:00Z");
    expect(result.uniqueIpsLatestMinute).toBe(3);
    expect(result.requestsLast15Minutes).toBe(91);
    expect(result.pageViewsLast15Minutes).toBe(3);
    expect(result.topPaths).toEqual([
      { path: "/api/chat", requests: 12 }, { path: "/marketplace", requests: 4 },
    ]);
  });

  it("does not invent zero visitors when the provider has no data", () => {
    expect(parseTrafficAnalytics({}).status).toBe("unavailable");
    expect(parseTrafficAnalytics({}).uniqueIpsLatestMinute).toBeNull();
    expect(parseTrafficAnalytics({ data: { viewer: { zones: [{ recent: [] }] } } }).status)
      .toBe("unavailable");
  });

  it("uses existing provider analytics and no new browser heartbeat or Firestore counters", () => {
    const traffic = readFileSync(new URL("./traffic.ts", import.meta.url), "utf8");
    const page = readFileSync(new URL("../../app/admin/usage/page.tsx", import.meta.url), "utf8");
    const usage = readFileSync(new URL("./usage.ts", import.meta.url), "utf8");
    expect(traffic).toContain("httpRequests1mGroups");
    expect(traffic).toContain("uniq { uniques }");
    expect(traffic).toContain("clientRequestPath");
    expect(traffic).not.toContain("getAdminDb");
    expect(traffic).not.toContain("collection(");
    expect(page).not.toContain("setInterval(");
    expect(page).toContain("IPs distintas en el último minuto registrado");
    expect(page).toContain("No son usuarios conectados exactos");
    expect(usage).toContain("getRecentTraffic(now)");
  });
});
