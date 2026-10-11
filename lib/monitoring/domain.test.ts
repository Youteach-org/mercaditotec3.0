import { describe, expect, it } from "vitest";
import { pacificDayStartUtc, sumMonitoringTimeSeries, workerAnalyticsTotals } from "./domain";

describe("monitoring calculations", () => {
  it("aligns the Firebase Spark reset to Pacific midnight in summer and winter", () => {
    expect(pacificDayStartUtc(new Date("2026-10-10T21:00:00Z")).toISOString())
      .toBe("2026-10-10T07:00:00.000Z");
    expect(pacificDayStartUtc(new Date("2026-12-10T21:00:00Z")).toISOString())
      .toBe("2026-12-10T08:00:00.000Z");
  });
  it("counts monitoring points across every series without assuming one page equals one number", () => {
    expect(sumMonitoringTimeSeries({ timeSeries: [
      { points: [{ value: { int64Value: "12" } }, { value: { int64Value: "8" } }] },
      { points: [{ value: { int64Value: "5" } }] },
    ] })).toBe(25);
    expect(sumMonitoringTimeSeries({})).toBeNull();
    expect(sumMonitoringTimeSeries({ timeSeries: [] })).toBe(0);
  });
  it("shows unavailable rather than false zero when Cloudflare returned no rows", () => {
    expect(workerAnalyticsTotals({ data: { viewer: { accounts: [{
      workersInvocationsAdaptive: [{ sum: { requests: 17, errors: 2, subrequests: 44 } }],
    }] } } })).toEqual({ requests: 17, errors: 2, subrequests: 44 });
    expect(workerAnalyticsTotals({ data: { viewer: { accounts: [{ workersInvocationsAdaptive: [] }] } } })).toBeNull();
  });
});
