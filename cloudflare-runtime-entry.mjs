// security-hardened production wrapper
import openNextWorker from "./.open-next/worker.js";
import { boundApiRequest, ApiBodyLimitError } from "./lib/security/requestBody.mjs";

import { enforceEdgeBudget } from "./lib/security/edgeBudget.mjs";
import { enforceHttps } from "./lib/security/enforceHttps.mjs";
import {
  serveCachedPublicCatalogue, affectsPublicCatalogue, evictPublicCatalogueCache,
} from "./lib/security/publicCatalogueEdgeCache.mjs";

const json = (value, init = {}) =>
  new Response(JSON.stringify(value), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init.headers || {}),
    },
  });

function getHandler() {
  if (!openNextWorker || typeof openNextWorker.fetch !== "function") {
    throw new Error("OpenNext worker is unavailable");
  }
  return openNextWorker;
}

export default {
  // One cleanup per day, not one cleanup for every page visitor or message.
  async scheduled(_controller, env, ctx) {
    const job = (async () => {
      const result = await getHandler().fetch(
        new Request("https://mercaditotec.store/api/internal/chat-retention", {
          method: "POST",
          headers: { "x-mercadito-internal-runtime": "chat-retention-cron-v1" },
        }),
        env,
        ctx,
      );
      if (!result.ok) console.warn("DAILY_CHAT_RETENTION_STATUS", result.status);
    })().catch((error) => {
      console.warn("DAILY_CHAT_RETENTION_ERROR", error instanceof Error ? error.name : "Unknown");
    });
    ctx.waitUntil(job);
  },
  async fetch(request, env, ctx) {
    // The browser can land on http://mercaditotec.store otherwise, despite
    // a completely valid certificate on the HTTPS version of the site.
    const httpsRedirect = enforceHttps(request);
    if (httpsRedirect) return httpsRedirect;

    const url = new URL(request.url);

    if (
      url.pathname === "/api/internal/firebase-rules-sync" ||
      url.pathname === "/api/internal/marketplace-catalog-refresh" ||
      url.pathname === "/api/internal/chat-retention"
    ) {
      return new Response("Not Found", {
        status: 404,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }

    if (url.pathname === "/__health") {
      const internalUrl = new URL("/api/internal/firebase-rules-sync", request.url);
      const rulesResponse = await getHandler().fetch(
        new Request(internalUrl, {
          method: "POST",
          headers: {
            "x-mercadito-internal-runtime": "firebase-rules-sync-v1",
          },
        }),
        env,
        ctx,
      );
      const rules = await rulesResponse.json().catch(() => ({ ok: false }));

      if (!rulesResponse.ok || rules?.ok !== true) {
        return json(
          {
            ok: false,
            firebaseRules: "sync-failed",
            firebaseRulesReason: rules?.reason || "sync-error",
            ...(rules?.iam ? { firebaseRulesIam: rules.iam } : {}),
          },
          { status: 503 },
        );
      }

      return json({
        ok: true,
        firebaseRules: {
          firestore: rules.firestore,
          storage: rules.storage,
        },
      });
    }

    if (url.pathname === "/__probe") {
      return new Response("Not Found", {
        status: 404,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }

    try {
      const limited = await enforceEdgeBudget(request, env);
      if (limited) return limited;
      const bounded = await boundApiRequest(request);
      const response = await serveCachedPublicCatalogue(
        bounded,
        ctx,
        () => getHandler().fetch(bounded, env, ctx),
      );

      if (affectsPublicCatalogue(request, response)) {
        // Once an authorized mutation completes, rebuild the shared public
        // snapshot off the response path, then evict this datacenter's cache.
        const refresh = (async () => {
          try {
            const internalUrl = new URL("/api/internal/marketplace-catalog-refresh", request.url);
            const result = await getHandler().fetch(
              new Request(internalUrl, {
                method: "POST",
                headers: { "x-mercadito-internal-runtime": "materialized-marketplace-refresh-v1" },
              }),
              env,
              ctx,
            );
            if (!result.ok) console.error("PUBLIC_CATALOGUE_REFRESH_RESPONSE", result.status);
          } catch (error) {
            console.error("PUBLIC_CATALOGUE_REFRESH_EXCEPTION",
              error instanceof Error ? error.name : "UnknownError");
          } finally {
            await evictPublicCatalogueCache(request);
          }
        })();
        if (typeof ctx?.waitUntil === "function") ctx.waitUntil(refresh);
        else await refresh;
      }
      return response;
    } catch (error) {
      if (error instanceof ApiBodyLimitError) return json({ error: error.message }, { status: 413 });
      console.error(
        "[mercadito-cloudflare-runtime]",
        error instanceof Error
          ? { name: error.name, message: error.message }
          : String(error),
      );

      return json(
        { ok: false, error: "Internal Server Error" },
        { status: 500 },
      );
    }
  },
};
