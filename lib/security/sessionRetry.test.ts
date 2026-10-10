import { describe, expect, it } from "vitest";
import { parseRetryAfterMs, immediateSessionRetryDelayMs, followUpSessionRetryDelayMs } from "./sessionRetry.mjs";

describe("session retry during temporary backend outages", () => {
  it("never immediately retries a 429 or an explicit 401/403", () => {
    expect(immediateSessionRetryDelayMs(429, 0, "60")).toBeNull();
    expect(immediateSessionRetryDelayMs(401, 0, null)).toBeNull();
    expect(immediateSessionRetryDelayMs(403, 0, null)).toBeNull();
    expect(followUpSessionRetryDelayMs(429, "60")).toBe(60000);
  });
  it("bounds the fast retries of transient 503 failures", () => {
    expect(immediateSessionRetryDelayMs(503, 0, null)).toBe(1200);
    expect(immediateSessionRetryDelayMs(503, 1, null)).toBeNull();
    expect(immediateSessionRetryDelayMs(503, 0, "30")).toBeNull();
    expect(followUpSessionRetryDelayMs(503, "30")).toBe(30000);
    expect(followUpSessionRetryDelayMs(503, null)).toBe(20000);
  });
  it("parses Retry-After seconds or dates without allowing unreasonable delays", () => {
    expect(parseRetryAfterMs("15")).toBe(15000);
    expect(parseRetryAfterMs("300")).toBe(120000);
    expect(parseRetryAfterMs("bogus")).toBeNull();
    expect(parseRetryAfterMs("Thu, 01 Jan 2026 00:01:00 GMT", Date.parse("2026-01-01T00:00:00Z"))).toBe(60000);
  });
});
