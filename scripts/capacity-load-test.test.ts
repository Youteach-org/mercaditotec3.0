import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { percentile, runLoadTest, validateLoadBudget, validateLoadTarget } from "./capacity-load-test.mjs";

let server: Server | null = null;
afterEach(async () => {
  if (server) {
    const closing = server;
    server = null;
    await new Promise<void>((resolve, reject) => closing.close((error) => error ? reject(error) : resolve()));
  }
});

describe("capacity test safety", () => {
  it("blocks production hosts and the older shared preview Worker", () => {
    for (const target of [
      "https://mercaditotec.store",
      "https://www.mercaditotec.store",
      "https://mercaditotec3-0.youteach-tk.workers.dev",
      "https://mercaditotec-preview.youteach-tk.workers.dev",
      "https://example.com",
      "https://mercaditotec-load-test.youteach-tk.workers.dev/api/admin/users",
    ]) {
      expect(() => validateLoadTarget(target)).toThrow();
    }
    expect(validateLoadTarget("https://mercaditotec-load-test.youteach-tk.workers.dev").isolated).toBe(true);
    expect(validateLoadTarget("http://127.0.0.1:8080").isolated).toBe(false);
  });

  it("only permits explicit public read-only test paths", () => {
    for (const path of ["/api/chat/reactions", "/api/admin/users", "/api/stores/123", "/__health"]) {
      expect(() => validateLoadTarget("http://127.0.0.1:8080", path)).toThrow();
    }
  });

  it("blocks high remote volume until data and quota isolation are confirmed", () => {
    expect(() => validateLoadBudget({ users: 21, requests: 101, isolated: true })).toThrow();
    expect(() => validateLoadBudget({ users: 5000, requests: 5000, isolated: true, highLoad: true })).toThrow();
    expect(() => validateLoadBudget({ users: 20, requests: 100, isolated: true })).not.toThrow();
    expect(() => validateLoadBudget({ users: 5000, requests: 5000, isolated: false })).not.toThrow();
    expect(() => validateLoadBudget({ users: 5001, requests: 50, isolated: false })).toThrow();
  });

  it("computes latency percentiles from observations", () => {
    expect(percentile([25, 5, 10, 20], 0.95)).toBe(25);
    expect(percentile([], 0.95)).toBeNull();
  });

  it("measures HTTP concurrency with a completely local fixture", async () => {
    server = createServer((_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end('{"ok":true}');
    });
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No local port");
    const result = await runLoadTest({
      target: "http://127.0.0.1:" + address.port,
      users: 5,
      requests: 15,
      path: "/__live",
    });
    expect(result).toMatchObject({
      targetType: "localhost",
      requests: 15, users: 5, http429: 0, http5xx: 0, networkFailures: 0,
      statuses: { "200": 15 },
    });
    expect(result.p95Ms).toBeGreaterThanOrEqual(0);
    expect(result.peakActive).toBeLessThanOrEqual(5);
  });
});
