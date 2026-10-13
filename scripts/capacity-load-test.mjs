import { performance } from "node:perf_hooks";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// No test is allowed to use the production hostname, Worker or live Firebase.
// Staging must be a separately deployed, isolated Worker named mercaditotec-load-*.
const SAFE_PATHS = new Set(["/__live", "/marketplace", "/api/marketplace", "/api/marketplace-v2"]);
const REMOTE_STAGING = /^mercaditotec-load-[a-z0-9-]+\.youteach-tk\.workers\.dev$/;

export function validateLoadTarget(address, path = "/__live") {
  const url = new URL(address);
  if (!SAFE_PATHS.has(path)) throw new Error("Only allowlisted public GET paths can be tested");
  if (url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
    throw new Error("Target must be an origin without credentials, paths or query strings");
  }
  const local = (url.hostname === "127.0.0.1" || url.hostname === "localhost") &&
    url.protocol === "http:";
  const isolated = REMOTE_STAGING.test(url.hostname) && url.protocol === "https:";
  if (!local && !isolated) {
    throw new Error("Unsafe target: production, preview and arbitrary domains are prohibited");
  }
  return { url: new URL(path, url), isolated };
}

export function validateLoadBudget({ users, requests, isolated, highLoad = false }) {
  if (!Number.isSafeInteger(users) || !Number.isSafeInteger(requests) || users < 1 || requests < 1) {
    throw new Error("Users and requests must be positive integers");
  }
  if (users > 5000 || requests > 100000) throw new Error("Hard load-test safety ceiling exceeded");
  // Remote Workers requests share account-level quota. Default to a small probe.
  if (isolated && !highLoad && (users > 20 || requests > 100)) {
    throw new Error("Remote staging smoke is limited to 20 concurrent/100 requests");
  }
  if (isolated && highLoad && process.env.CAPACITY_ISOLATED_BACKEND_CONFIRMED !== "yes") {
    throw new Error("High-load testing requires isolated staging DB and account capacity approval");
  }
  if (!isolated && (users > 5000 || requests > 100000)) throw new Error("Local hard limit");
}

export function percentile(values, quantile) {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  return Math.round(ordered[Math.ceil(quantile * ordered.length) - 1]);
}

export async function runLoadTest({ target, users, requests, path = "/__live", highLoad = false }) {
  const { url, isolated } = validateLoadTarget(target, path);
  validateLoadBudget({ users, requests, isolated, highLoad });
  const latencyMs = [];
  const statuses = {};
  let failures = 0, next = 0, active = 0, peakActive = 0;
  const started = performance.now();

  const worker = async () => {
    while (true) {
      const id = next++;
      if (id >= requests) return;
      active++;
      peakActive = Math.max(peakActive, active);
      const begin = performance.now();
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: { Accept: path === "/marketplace" ? "text/html" : "application/json" },
          signal: AbortSignal.timeout(15000),
          redirect: "manual",
        });
        // Read the complete response so a streaming HTML request cannot count
        // as completed at TTFB. Cap each response to avoid runaway memory use.
        let bytes = 0;
        if (response.body) {
          for await (const chunk of response.body) {
            bytes += chunk.byteLength;
            if (bytes > 2_000_000) throw new Error("Response exceeds 2 MB safety cap");
          }
        }
        statuses[response.status] = (statuses[response.status] || 0) + 1;
        latencyMs.push(performance.now() - begin);
      } catch {
        failures++;
        latencyMs.push(performance.now() - begin);
      } finally {
        active--;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(users, requests) }, worker));
  const durationMs = performance.now() - started;
  const http429 = statuses[429] || 0;
  const http5xx = Object.entries(statuses).reduce((total, [code, count]) =>
    total + (Number(code) >= 500 ? count : 0), 0);
  const result = {
    targetType: isolated ? "isolated-staging" : "localhost",
    path, users, requests, peakActive,
    durationMs: Math.round(durationMs),
    requestsPerSecond: Math.round(requests / Math.max(durationMs / 1000, 0.001) * 10) / 10,
    p50Ms: percentile(latencyMs, 0.5),
    p95Ms: percentile(latencyMs, 0.95),
    p99Ms: percentile(latencyMs, 0.99),
    statuses, http429, http5xx, networkFailures: failures,
    // This is HTTP test concurrency, not real signed-in users.
    caveat: "Not a simulation of Firebase Auth, chat listeners or 5000 real people",
  };
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = new Map();
  for (let i = 2; i < process.argv.length; i += 2) {
    args.set(process.argv[i], process.argv[i + 1]);
  }
  try {
    const target = args.get("--target") || "http://127.0.0.1:8080";
    const users = Number(args.get("--users") || 10);
    const requests = Number(args.get("--requests") || 100);
    const path = args.get("--path") || "/__live";
    const highLoad = args.get("--high-load") === "yes";
    const result = await runLoadTest({ target, users, requests, path, highLoad });
    console.log(JSON.stringify(result, null, 2));
    if (result.http5xx || result.networkFailures || result.http429) process.exitCode = 1;
  } catch (error) {
    console.error("Capacity test blocked:", error instanceof Error ? error.message : "Unknown");
    process.exitCode = 1;
  }
}
