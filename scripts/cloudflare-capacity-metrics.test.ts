import { describe, expect, it } from "vitest";
import { formatCapacitySummary, parseWorkerUsage } from "./cloudflare-capacity-metrics.mjs";

const mock = (rows: unknown[]) => ({ data: { viewer: { accounts: [{ workersInvocationsAdaptive: rows }] } } });

describe("Cloudflare capacity baseline", () => {
  it("counts resource failures separately without confusing disconnected visitors with errors", () => {
    const result = parseWorkerUsage(mock([
      { dimensions: { status: "success" }, sum: { requests: 1000, errors: 0 }, quantiles: { cpuTimeP50: 14000, cpuTimeP99: 220000 } },
      { dimensions: { status: "clientDisconnected" }, sum: { requests: 7, errors: 0 }, quantiles: { cpuTimeP50: 5000, cpuTimeP99: 80000 } },
      { dimensions: { status: "exceededResources" }, sum: { requests: 3, errors: 3 }, quantiles: { cpuTimeP50: 10000, cpuTimeP99: 40000 } },
    ]));
    expect(result).toMatchObject({ available: true, requests: 1010, errors: 3, resourceFailures: 3 });
    expect(result.errorPercent).toBe(0.3);
    expect(result.rows[0].cpuTimeP99).toBe(220000);
  });

  it("marks missing samples as unavailable instead of claiming 0 errors", () => {
    const result = parseWorkerUsage(mock([]));
    expect(result.available).toBe(false);
    expect(result.errorPercent).toBeNull();
    expect(formatCapacitySummary({ "4 h": result }, "2026-10-13T12:00:00Z")).toContain("Sin datos");
  });

  it("does not accept inconsistent metrics or GraphQL errors", () => {
    expect(() => parseWorkerUsage({ errors: [{ message: "permission denied" }] })).toThrow();
    expect(() => parseWorkerUsage(mock([{ dimensions: { status: "success" }, sum: { requests: 1, errors: 5 } }]))).toThrow();
    expect(() => parseWorkerUsage({ data: { viewer: { accounts: [] } } })).toThrow();
  });

  it("reports only aggregated status and CPU with no visitor identifiers", () => {
    const report = formatCapacitySummary({ "4 h": parseWorkerUsage(mock([
      { dimensions: { status: "success" }, sum: { requests: 25, errors: 0 }, quantiles: { cpuTimeP50: 123, cpuTimeP99: 456 } },
    ])) }, "2026-10-13T12:00:00Z");
    expect(report).toContain("25");
    expect(report).toContain("p99=456");
    expect(report).not.toContain("firebaseUser");
  });
});
