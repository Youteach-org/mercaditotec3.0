import { getAdminAccessToken, getFirebaseProjectId } from "../firebaseAdmin";
import { pacificDayStartUtc, sumMonitoringTimeSeries, workerAnalyticsTotals } from "./domain";

export interface Meter {
  value: number | null;
  reason?: string;
}

export interface UsageSnapshot {
  checkedAt: string;
  source: "provider-metrics";
  workers: { requests: Meter; errors: Meter; subrequests: Meter };
  firestore: { reads: Meter; writes: Meter; deletes: Meter };
}

const missing = (reason: string): Meter => ({ value: null, reason });
const metric = (value: number): Meter => ({ value });
let cached: { at: number; promise: Promise<UsageSnapshot> } | null = null;
const WORKER_SCRIPT = "mercaditotec3-0";
const DEFAULT_CF_ACCOUNT = "043e7755b65ac4fc8b8572963a544340";

async function cloudflareCounters(now: Date): Promise<UsageSnapshot["workers"]> {
  const accountTag = process.env.CLOUDFLARE_ACCOUNT_ID ?? DEFAULT_CF_ACCOUNT;
  const token = process.env.CLOUDFLARE_ANALYTICS_TOKEN;
  const unavailable = (reason: string) => ({
    requests: missing(reason), errors: missing(reason), subrequests: missing(reason),
  });
  if (!token || !accountTag) return unavailable("Falta configurar el acceso de solo lectura a Cloudflare Analytics.");
  try {
    const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      signal: AbortSignal.timeout(9000),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query($accountTag: string, $start: Time, $end: Time, $scriptName: string) {
          viewer { accounts(filter: { accountTag: $accountTag }) {
            workersInvocationsAdaptive(
              limit: 10000
              filter: { datetime_geq: $start, datetime_leq: $end, scriptName: $scriptName }
            ) { sum { requests errors subrequests } }
          } }
        }`,
        variables: {
          accountTag,
          start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString(),
          end: now.toISOString(),
          scriptName: WORKER_SCRIPT,
        },
      }),
      cache: "no-store",
    });
    if (!response.ok) return unavailable(`Cloudflare Analytics no respondió (HTTP ${response.status}).`);
    const body = await response.json();
    if (Array.isArray(body.errors) && body.errors.length) {
      return unavailable("Cloudflare Analytics rechazó la consulta o los permisos.");
    }
    const totals = workerAnalyticsTotals(body);
    if (!totals) return unavailable("Cloudflare aún no devolvió muestras para este periodo.");
    return {
      requests: metric(totals.requests),
      errors: metric(totals.errors),
      subrequests: metric(totals.subrequests),
    };
  } catch {
    return unavailable("No se pudo conectar con Cloudflare Analytics.");
  }
}

async function firestoreCounter(
  now: Date,
  token: string,
  projectId: string,
  metricName: string,
): Promise<Meter> {
  try {
    const url = new URL(
      `https://monitoring.googleapis.com/v3/projects/${encodeURIComponent(projectId)}/timeSeries`,
    );
    url.searchParams.set("filter", `metric.type="firestore.googleapis.com/document/${metricName}"`);
    url.searchParams.set("interval.startTime", pacificDayStartUtc(now).toISOString());
    url.searchParams.set("interval.endTime", now.toISOString());
    url.searchParams.set("aggregation.alignmentPeriod", "86400s");
    url.searchParams.set("aggregation.perSeriesAligner", "ALIGN_SUM");
    url.searchParams.set("view", "FULL");
    url.searchParams.set("pageSize", "10000");
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(9000),
      cache: "no-store",
    });
    if (!response.ok) return missing(
      response.status === 403 || response.status === 404
        ? "La cuenta de servicio no puede consultar Cloud Monitoring. Consulta Firebase Console."
        : `Google Cloud Monitoring no respondió (HTTP ${response.status}).`,
    );
    const body = await response.json();
    if (body.nextPageToken) return missing("La consulta devolvió resultados parciales.");
    const count = sumMonitoringTimeSeries(body);
    return count === null
      ? missing("Cloud Monitoring aún no ha publicado el consumo.")
      : metric(count);
  } catch {
    return missing("No se pudo consultar Google Cloud Monitoring.");
  }
}

async function firebaseCounters(now: Date): Promise<UsageSnapshot["firestore"]> {
  const unavailable = (reason: string) => ({
    reads: missing(reason), writes: missing(reason), deletes: missing(reason),
  });
  try {
    const token = await getAdminAccessToken();
    const projectId = getFirebaseProjectId();
    const [reads, writes, deletes] = await Promise.all([
      firestoreCounter(now, token, projectId, "read_count"),
      firestoreCounter(now, token, projectId, "write_count"),
      firestoreCounter(now, token, projectId, "delete_count"),
    ]);
    return { reads, writes, deletes };
  } catch {
    return unavailable("No se pudo obtener autorización de métricas de Firebase.");
  }
}

export async function loadOfficialUsage(): Promise<UsageSnapshot> {
  if (cached && Date.now() - cached.at < 120_000) return cached.promise;
  const promise = (async () => {
    const now = new Date();
    const [workers, firestore] = await Promise.all([
      cloudflareCounters(now),
      firebaseCounters(now),
    ]);
    return { checkedAt: now.toISOString(), source: "provider-metrics" as const, workers, firestore };
  })();
  cached = { at: Date.now(), promise };
  return promise;
}
