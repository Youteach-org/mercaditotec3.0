import { appendFileSync } from "node:fs";
import { parseWorkerUsage, formatCapacitySummary } from "./cloudflare-capacity-metrics.mjs";

// Read-only provider query. Never sends traffic to Mercadito itself.
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!token) throw new Error("Cloudflare token unavailable; no capacity data");
const now = new Date();
const query = 'query($account:String,$start:Time,$end:Time){ viewer { accounts(filter:{accountTag:$account}){ workersInvocationsAdaptive(limit:100,filter:{scriptName:"mercaditotec3-0",datetime_geq:$start,datetime_leq:$end}){dimensions{status} sum{requests errors} quantiles{cpuTimeP50 cpuTimeP99}} } } }';
async function measure(hours) {
  const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({
      query,
      variables: {
        account: process.env.CLOUDFLARE_ACCOUNT_ID || "043e7755b65ac4fc8b8572963a544340",
        start: new Date(now.getTime() - hours * 3600000).toISOString(),
        end: now.toISOString(),
      },
    }),
  });
  if (!response.ok) throw new Error("Cloudflare metrics HTTP " + response.status);
  return parseWorkerUsage(await response.json());
}
try {
  const [four, day] = await Promise.all([measure(4), measure(24)]);
  const report = formatCapacitySummary({"Últimas 4 h": four, "Últimas 24 h": day}, now.toISOString());
  process.stdout.write(report);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report, "utf8");
} catch (error) {
  console.error("No se pudieron obtener métricas agregadas:", error instanceof Error ? error.message : "Unknown");
  process.exitCode = 1;
}
