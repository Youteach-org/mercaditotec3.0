import { describe, expect, it } from "vitest";
import { parseDailyTraffic, parsePopularPages } from "./siteAnalytics";

describe("Cloudflare traffic parsing", () => {
  it("accepts daily aggregates and orders chronologically", () => {
    const result = parseDailyTraffic([
      { dimensions: { date: "2026-10-23" }, sum: { pageViews: 13, requests: 70 }, uniq: { uniques: 6 } },
      { dimensions: { date: "2026-10-22" }, sum: { pageViews: 5, requests: 24 }, uniq: { uniques: 4 } },
      { dimensions: { date: "invalid" }, sum: { pageViews: 100 } },
    ]);
    expect(result).toEqual([
      { day: "2026-10-22", pageViews: 5, requests: 24, uniqueIps: 4 },
      { day: "2026-10-23", pageViews: 13, requests: 70, uniqueIps: 6 },
    ]);
  });

  it("does not treat scripts or API traffic as pages", () => {
    const result = parsePopularPages([
      { dimensions: { clientRequestPath: "/api/descubre/preview" }, count: 100 },
      { dimensions: { clientRequestPath: "/_next/static/main.js" }, count: 100 },
      { dimensions: { clientRequestPath: "/cdn-cgi/rum" }, count: 100 },
      { dimensions: { clientRequestPath: "//other.example" }, count: 100 },
      { dimensions: { clientRequestPath: "/descubre" }, count: 20, avg: { sampleInterval: 3 } },
      { dimensions: { clientRequestPath: "/marketplace/stores/ke-rollos" }, count: 7 },
    ]);
    expect(result).toEqual([
      { path: "/descubre", requestsEstimate: 60 },
      { path: "/marketplace/stores/ke-rollos", requestsEstimate: 7 },
    ]);
  });

  it("handles invalid vendor payloads without exposing them", () => {
    expect(parseDailyTraffic(null)).toEqual([]);
    expect(parsePopularPages({ broken: true })).toEqual([]);
    expect(parsePopularPages([{ dimensions: { clientRequestPath: "/login" }, count: -9 }]))
      .toEqual([{ path: "/login", requestsEstimate: 0 }]);
  });
});
