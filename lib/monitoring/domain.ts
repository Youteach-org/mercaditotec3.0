const PACIFIC = "America/Los_Angeles";

/** Firebase Spark quotas reset around midnight in Pacific time, not in Mexico. */
export function pacificDayStartUtc(now: Date): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value ?? 0);
  const candidate = new Date(Date.UTC(part("year"), part("month") - 1, part("day"), 8));
  const localHour = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC, hour: "2-digit", hourCycle: "h23",
  }).format(candidate));
  // Midnight Pacific is 07:00 UTC in daylight time, 08:00 UTC otherwise.
  return new Date(candidate.getTime() - (localHour === 1 ? 3_600_000 : 0));
}

export function sumMonitoringTimeSeries(input: unknown): number | null {
  if (!input || typeof input !== "object") return null;
  const series = (input as { timeSeries?: unknown }).timeSeries;
  if (!Array.isArray(series)) return null;
  let sum = 0;
  for (const row of series) {
    if (!row || !Array.isArray(row.points)) continue;
    for (const point of row.points) {
      const raw = point?.value?.int64Value;
      const n = typeof raw === "number" || typeof raw === "string" ? Number(raw) : NaN;
      if (Number.isFinite(n) && n >= 0) sum += n;
    }
  }
  return sum;
}

export function workerAnalyticsTotals(input: unknown): { requests: number; errors: number; subrequests: number } | null {
  if (!input || typeof input !== "object") return null;
  const rows = (input as {
    data?: { viewer?: { accounts?: Array<{ workersInvocationsAdaptive?: Array<{
      sum?: { requests?: number; errors?: number; subrequests?: number };
    }> }> } };
  }).data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows.reduce((totals, row) => ({
    requests: totals.requests + Number(row.sum?.requests ?? 0),
    errors: totals.errors + Number(row.sum?.errors ?? 0),
    subrequests: totals.subrequests + Number(row.sum?.subrequests ?? 0),
  }), { requests: 0, errors: 0, subrequests: 0 });
}

export const FREE_QUOTA = {
  workerRequestsPerDay: 100_000,
  firestoreReadsPerDay: 50_000,
  firestoreWritesPerDay: 20_000,
  firestoreDeletesPerDay: 20_000,
} as const;
