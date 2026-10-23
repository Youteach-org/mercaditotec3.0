/**
 * Site traffic for MercaditoTec's own administration panel.
 * Read-only Cloudflare edge statistics: no browser beacon, cookies, per-visitor
 * identity collection or new Firestore writes.
 */
export type DailySiteTraffic = {
  day: string;
  pageViews: number;
  requests: number;
  uniqueIps: number;
};

export type PopularPage = { path: string; requestsEstimate: number };

export type SiteAnalytics = {
  status: "available" | "unavailable";
  reason?: string;
  days: 7 | 30;
  zone: "mercaditotec.store";
  checkedAt: string;
  timezone: "UTC";
  daily: DailySiteTraffic[];
  pageViews: number | null;
  requests: number | null;
  uniqueIpsToday: number | null;
  topPages: PopularPage[];
  topPagesReason?: string;
};

const ZONE_HOST = "mercaditotec.store";
const CACHE_MS = 120_000;
let zoneCache: { tag: string; at: number } | null = null;
const cache = new Map<number, { at: number; promise: Promise<SiteAnalytics> }>();

function nonnegative(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : 0;
}

export function parseDailyTraffic(value: unknown): DailySiteTraffic[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    const day = row?.dimensions?.date;
    if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return [];
    return [{
      day,
      pageViews: nonnegative(row?.sum?.pageViews),
      requests: nonnegative(row?.sum?.requests),
      uniqueIps: nonnegative(row?.uniq?.uniques),
    }];
  }).sort((a, b) => a.day.localeCompare(b.day));
}

function isPagePath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  if (/^\/(?:api|_next|cdn-cgi|__health|__probe)(?:\/|$)/i.test(path)) return false;
  if (/\.(?:css|js|json|png|jpg|jpeg|gif|svg|webp|ico|woff2?|map|txt|xml|webmanifest)$/i.test(path)) return false;
  return !/[?#]/.test(path);
}

export function parsePopularPages(value: unknown): PopularPage[] {
  if (!Array.isArray(value)) return [];
  const paths = new Map<string, number>();
  for (const item of value) {
    const path = item?.dimensions?.clientRequestPath;
    if (typeof path !== "string" || path.length > 220 || !isPagePath(path)) continue;
    const sampled = nonnegative(item?.count);
    const interval = Math.max(1, nonnegative(item?.avg?.sampleInterval ?? 1));
    paths.set(path, (paths.get(path) ?? 0) + sampled * interval);
  }
  return [...paths.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
    .map(([path, requestsEstimate]) => ({ path, requestsEstimate }));
}

async function resolveZone(token: string): Promise<string | null> {
  const configured = process.env.CLOUDFLARE_ZONE_ID?.trim();
  if (configured) return configured;
  if (zoneCache && Date.now() - zoneCache.at < 86_400_000) return zoneCache.tag;
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(ZONE_HOST)}&per_page=1`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8_000), cache: "no-store" },
  );
  if (!response.ok) return null;
  const data = await response.json() as { result?: Array<{ id?: string; name?: string }> };
  const zone = data.result?.find((item) => item.name === ZONE_HOST);
  if (!zone?.id) return null;
  zoneCache = { tag: zone.id, at: Date.now() };
  return zone.id;
}

async function graphql(token: string, query: string, variables: Record<string, string>): Promise<Record<string, unknown>> {
  const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Cloudflare devolvió HTTP ${response.status}`);
  const data = await response.json() as {
    data?: Record<string, unknown>;
    errors?: Array<{ message?: string }>;
  };
  if (data.errors?.length) throw new Error("La cuenta de Cloudflare no autoriza esta consulta o no ofrece este conjunto de estadísticas.");
  if (!data.data) throw new Error("Cloudflare no devolvió estadísticas.");
  return data.data;
}

function firstZone(data: Record<string, unknown>): Record<string, unknown> | null {
  const viewer = data.viewer as { zones?: unknown } | undefined;
  const zones = viewer?.zones;
  if (!Array.isArray(zones) || !zones[0] || typeof zones[0] !== "object") return null;
  return zones[0] as Record<string, unknown>;
}

const DAILY_QUERY = `query DailySiteTraffic($zoneTag: string, $start: Date, $end: Date) {
  viewer { zones(filter: { zoneTag: $zoneTag }) {
    daily: httpRequests1dGroups(
      limit: 31, orderBy: [date_ASC],
      filter: { date_geq: $start, date_lt: $end }
    ) { dimensions { date } sum { pageViews requests } uniq { uniques } }
  } }
}`;

const PATH_QUERY = `query PopularSitePages($zoneTag: string, $start: Time, $end: Time) {
  viewer { zones(filter: { zoneTag: $zoneTag }) {
    popular: httpRequestsAdaptiveGroups(
      limit: 200, orderBy: [count_DESC],
      filter: {
        datetime_geq: $start, datetime_lt: $end,
        clientRequestHTTPHost: "mercaditotec.store", requestSource: "eyeball"
      }
    ) { count avg { sampleInterval } dimensions { clientRequestPath } }
  } }
}`;

async function fetchSiteAnalytics(days: 7 | 30): Promise<SiteAnalytics> {
  const now = new Date();
  const result: SiteAnalytics = {
    status: "unavailable",
    days, zone: ZONE_HOST, checkedAt: now.toISOString(), timezone: "UTC",
    daily: [], pageViews: null, requests: null, uniqueIpsToday: null, topPages: [],
  };
  const token = process.env.CLOUDFLARE_ANALYTICS_TOKEN;
  if (!token) {
    return { ...result, reason: "Falta configurar CLOUDFLARE_ANALYTICS_TOKEN en el Worker de producción (acceso de lectura)." };
  }
  try {
    const zoneTag = await resolveZone(token);
    if (!zoneTag) {
      return { ...result, reason: "No fue posible identificar la zona. Revisa CLOUDFLARE_ZONE_ID o el permiso Zona:Leer." };
    }
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const start = new Date(today.getTime() - (days - 1) * 86_400_000);
    const tomorrow = new Date(today.getTime() + 86_400_000);
    const variables = {
      zoneTag,
      start: start.toISOString().slice(0, 10),
      end: tomorrow.toISOString().slice(0, 10),
    };
    const dailyData = await graphql(token, DAILY_QUERY, variables);
    const zone = firstZone(dailyData);
    if (!zone || !Array.isArray(zone.daily)) {
      return { ...result, reason: "Cloudflare no devolvió datos diarios para esta zona." };
    }
    const parsed = parseDailyTraffic(zone.daily);
    const existing = new Map(parsed.map((entry) => [entry.day, entry]));
    const daily: DailySiteTraffic[] = [];
    for (let i = 0; i < days; i++) {
      const day = new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10);
      daily.push(existing.get(day) ?? { day, pageViews: 0, requests: 0, uniqueIps: 0 });
    }
    const todayValue = daily.at(-1);
    result.status = "available";
    result.daily = daily;
    result.pageViews = daily.reduce((total, day) => total + day.pageViews, 0);
    result.requests = daily.reduce((total, day) => total + day.requests, 0);
    result.uniqueIpsToday = todayValue?.uniqueIps ?? 0;

    try {
      const pathData = await graphql(token, PATH_QUERY, {
        zoneTag, start: start.toISOString(), end: now.toISOString(),
      });
      const pathZone = firstZone(pathData);
      result.topPages = parsePopularPages(pathZone?.popular);
      if (!result.topPages.length) result.topPagesReason = "No hay rutas de páginas disponibles para este periodo.";
    } catch {
      result.topPagesReason = "El plan o los permisos de Cloudflare no permiten consultar las rutas individuales.";
    }
    return result;
  } catch (error) {
    return { ...result, reason: error instanceof Error ? error.message : "No se pudieron consultar las estadísticas." };
  }
}

export async function loadSiteAnalytics(days: 7 | 30): Promise<SiteAnalytics> {
  const now = Date.now();
  const current = cache.get(days);
  if (current && now - current.at < CACHE_MS) return current.promise;
  const promise = fetchSiteAnalytics(days);
  cache.set(days, { at: now, promise });
  return promise;
}
