/**
 * Cloudflare traffic diagnostics. Uses already aggregated provider analytics;
 * never writes presence/heartbeat documents to Firestore.
 */
export interface TrafficMinute {
  minute: string;
  uniqueIps: number;
  requests: number;
  pageViews: number;
}
export interface TrafficPath { path: string; requests: number }
export interface TrafficSnapshot {
  status: "available" | "unavailable";
  reason?: string;
  providerLagNotice: string;
  latestMinute: string | null;
  uniqueIpsLatestMinute: number | null;
  requestsLast15Minutes: number | null;
  pageViewsLast15Minutes: number | null;
  byMinute: TrafficMinute[];
  topPaths: TrafficPath[];
}

const PROVIDER_LAG = "Las estadísticas pueden retrasarse varios minutos. Una IP no equivale a una persona y una visita no demuestra que siga conectada.";
const blank = (reason: string): TrafficSnapshot => ({
  status: "unavailable",
  reason,
  providerLagNotice: PROVIDER_LAG,
  latestMinute: null,
  uniqueIpsLatestMinute: null,
  requestsLast15Minutes: null,
  pageViewsLast15Minutes: null,
  byMinute: [],
  topPaths: [],
});
type AnalyticsMinute = {
  dimensions?: { datetimeMinute?: unknown };
  uniq?: { uniques?: unknown };
  sum?: { requests?: unknown; pageViews?: unknown };
};
type AnalyticsPath = {
  count?: unknown;
  avg?: { sampleInterval?: unknown };
  dimensions?: { clientRequestPath?: unknown };
};
export function parseTrafficAnalytics(data: unknown): TrafficSnapshot {
  const zones = (data as { data?: { viewer?: { zones?: unknown } } } | null)?.data?.viewer?.zones;
  const zone = Array.isArray(zones) ? zones[0] : undefined;
  if (!zone || typeof zone !== "object") return blank("Cloudflare no devolvió una zona válida.");
  const values = zone as { recent?: AnalyticsMinute[]; topPaths?: AnalyticsPath[] };
  if (!Array.isArray(values.recent)) return blank("Cloudflare no devolvió datos de visitantes recientes.");
  const byMinute = values.recent.flatMap((row) => {
    const minute = row?.dimensions?.datetimeMinute;
    if (typeof minute !== "string" || !Number.isFinite(Date.parse(minute))) return [];
    const count = (value: unknown) => Math.max(0, Number(value) || 0);
    return [{ minute, uniqueIps: count(row.uniq?.uniques),
      requests: count(row.sum?.requests), pageViews: count(row.sum?.pageViews) }];
  }).sort((a, b) => a.minute.localeCompare(b.minute)).slice(-20);
  const last = byMinute.at(-1);
  const topPaths = Array.isArray(values.topPaths) ? values.topPaths.flatMap((row) => {
    const path = row?.dimensions?.clientRequestPath;
    const count = Number(row?.count);
    const multiplier = Number(row?.avg?.sampleInterval ?? 1);
    if (typeof path !== "string" || !path.startsWith("/") || !Number.isFinite(count)) return [];
    return [{ path: path.slice(0, 150), requests: Math.round(count * (Number.isFinite(multiplier) && multiplier >= 1 ? multiplier : 1)) }];
  }).sort((a, b) => b.requests - a.requests).slice(0, 8) : [];
  if (!last) return blank("No se detectó tráfico en los minutos consultados, o Cloudflare todavía no ha procesado los datos.");
  return {
    status: "available", providerLagNotice: PROVIDER_LAG,
    latestMinute: last.minute, uniqueIpsLatestMinute: last.uniqueIps,
    requestsLast15Minutes: byMinute.reduce((sum, row) => sum + row.requests, 0),
    pageViewsLast15Minutes: byMinute.reduce((sum, row) => sum + row.pageViews, 0),
    byMinute, topPaths,
  };
}

let cachedZone: { tag: string; savedAt: number } | null = null;
async function zoneTagForToken(token: string): Promise<string | null> {
  const fromEnv = process.env.CLOUDFLARE_ZONE_ID?.trim();
  if (fromEnv) return fromEnv;
  if (cachedZone && Date.now() - cachedZone.savedAt < 86_400_000) return cachedZone.tag;
  // A read-only token with Zone:Read can resolve the zone without manually
  // supplying its ID. If access is denied, do not guess a zone ID.
  const response = await fetch("https://api.cloudflare.com/client/v4/zones?name=mercaditotec.store&per_page=1", {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(7000),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const body = await response.json() as { result?: Array<{ id?: string; name?: string }> };
  const zone = body.result?.find((item) => item.name === "mercaditotec.store");
  if (!zone?.id) return null;
  cachedZone = { tag: zone.id, savedAt: Date.now() };
  return zone.id;
}

/**
 * ~15 minutes of observed HTTP traffic, not a live presence service.
 * Distinct IPs per minute are NOT signed-in users and must not be added across
 * minutes; university NAT and bot traffic can both distort this proxy.
 */
export async function getRecentTraffic(now: Date): Promise<TrafficSnapshot> {
  const token = process.env.CLOUDFLARE_ANALYTICS_TOKEN;
  if (!token) return blank("Falta configurar el token de análisis de Cloudflare (solo lectura).");
  try {
    const zoneTag = await zoneTagForToken(token);
    if (!zoneTag) return blank("Falta el identificador de la zona Cloudflare o el permiso Zona:Leer.");
    const start = new Date(now.getTime() - 15 * 60_000).toISOString();
    const end = now.toISOString();
    const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      signal: AbortSignal.timeout(9000),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query($zoneTag: string, $start: Time, $end: Time) {
          viewer {
            zones(filter: { zoneTag: $zoneTag }) {
              recent: httpRequests1mGroups(
                limit: 20, orderBy: [datetimeMinute_DESC]
                filter: { datetime_geq: $start, datetime_lt: $end }
              ) { dimensions { datetimeMinute } uniq { uniques } sum { requests pageViews } }
              topPaths: httpRequestsAdaptiveGroups(
                limit: 8, orderBy: [count_DESC]
                filter: { datetime_geq: $start, datetime_lt: $end,
                  clientRequestHTTPHost: "mercaditotec.store", requestSource: "eyeball" }
              ) { count avg { sampleInterval } dimensions { clientRequestPath } }
            }
          }
        }`,
        variables: { zoneTag, start, end },
      }),
      cache: "no-store",
    });
    if (!response.ok) return blank(`No se pudo consultar Cloudflare Analytics (HTTP ${response.status}).`);
    const body = await response.json() as { errors?: Array<unknown> };
    if (body.errors?.length) return blank("Cloudflare no autorizó la consulta de visitas o no dispone de este conjunto de métricas.");
    return parseTrafficAnalytics(body);
  } catch {
    return blank("Cloudflare Analytics no está disponible temporalmente.");
  }
}
