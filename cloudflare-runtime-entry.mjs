// security-hardened production wrapper
import openNextWorker from "./.open-next/worker.js";
import { boundApiRequest, ApiBodyLimitError } from "./lib/security/requestBody.mjs";
import { screenListing } from "./lib/descubre/automaticReview.mjs";

import { enforceEdgeBudget } from "./lib/security/edgeBudget.mjs";
import { enforceHttps } from "./lib/security/enforceHttps.mjs";
import { serveCachedPublicShell } from "./lib/security/publicShellEdgeCache.mjs";
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
    const requestStartedAt = Date.now();
    // The browser can land on http://mercaditotec.store otherwise, despite
    // a completely valid certificate on the HTTPS version of the site.
    const httpsRedirect = enforceHttps(request);
    if (httpsRedirect) return httpsRedirect;

    const url = new URL(request.url);

    // Next statically defines "/" as a redirect. Serve it before OpenNext
    // to avoid spending Workers CPU on every visitor's first request.
    if (url.pathname === "/" && (request.method === "GET" || request.method === "HEAD")
        && (request.headers.get("accept") || "").includes("text/html")
        && !request.headers.has("rsc")) {
      return new Response(null, {
        status: 307,
        headers: {
          location: new URL("/marketplace" + url.search, url).toString(),
          "cache-control": "public, max-age=0, s-maxage=300",
          "strict-transport-security": "max-age=31536000",
        },
      });
    }

    if (
      url.pathname === "/api/internal/firebase-rules-sync" ||
      url.pathname === "/api/internal/marketplace-catalog-refresh" ||
      url.pathname === "/api/internal/chat-retention" ||
      url.pathname === "/api/internal/descubre-moderation"
    ) {
      return new Response("Not Found", {
        status: 404,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }

    // Cheap liveness check: monitoring should not invoke Next.js, Firebase
    // token exchange or Firebase Rules deployment on every health probe.
    // Keep /__health for the existing deployment-time rules verification.
    if (url.pathname === "/__live") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response(null, { status: 405, headers: { allow: "GET, HEAD", "cache-control": "no-store" } });
      }
      return request.method === "HEAD"
        ? new Response(null, { status: 204, headers: { "cache-control": "no-store" } })
        : json({ ok: true, live: true });
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
      // For a seller-created item, the normal API writes only a private
      // screening draft. Only THIS trusted edge layer runs the image+text
      // classifier and finalizes its decision through an edge-only endpoint.
      const listingPost = bounded.method === "POST" &&
        url.pathname === "/api/descubre/anuncios";
      const screeningInput = listingPost ? bounded.clone() : null;
      let response = await serveCachedPublicShell(
        bounded,
        env,
        ctx,
        () => serveCachedPublicCatalogue(
          bounded,
          ctx,
          () => getHandler().fetch(bounded, env, ctx),
        ),
      );

      if (listingPost && response.status === 201 && screeningInput) {
        const body = await screeningInput.json().catch(() => null);
        const draft = await response.clone().json().catch(() => null);
        if (!draft?.id || !body) {
          return json({ error: "No se pudo verificar el anuncio." }, { status: 503 });
        }
        const review = await screenListing(body, env.AI);
        const internalUrl = new URL("/api/internal/descubre-moderation", bounded.url);
        const approved = await getHandler().fetch(new Request(internalUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-mercadito-internal-runtime": "discover-automatic-screen-v1",
          },
          body: JSON.stringify({
            id: draft.id, decision: review.decision, reason: review.reason,
          }),
        }), env, ctx);
        if (!approved.ok) {
          // Never return an approval when the server has not recorded it.
          return json({ id: draft.id, status: "screening",
            error: "El anuncio permanece oculto porque no pudo completarse la revisión." }, { status: 503 });
        }
        if (review.decision === "approved") {
          // Materialize once after a successful mutation instead of running a
          // Firebase query per home-page visitor or published-item card.
          try {
            const refreshUrl = new URL("/api/internal/marketplace-catalog-refresh", bounded.url);
            await getHandler().fetch(new Request(refreshUrl, {
              method: "POST",
              headers: { "x-mercadito-internal-runtime": "materialized-marketplace-refresh-v1" },
            }), env, ctx);
          } catch (error) {
            console.warn("DISCOVER_MATERIALIZATION_DELAYED",
              error instanceof Error ? error.name : "Unknown");
          }
        }
        response = json({
          id: draft.id,
          status: review.decision,
          ...(review.reason ? { message: review.reason } : {}),
        }, { status: review.decision === "approved" ? 201 : 422 });
      }

      // Wall time includes upstream I/O and is not a CPU metric. Log only a
      // small sample of very slow responses, never URL IDs, tokens or bodies.
      if (url.pathname.startsWith("/api/") && Date.now() - requestStartedAt > 2000 && Math.random() < 0.05) {
        const family = url.pathname.split("/").slice(0, 3).join("/");
        console.warn("SLOW_API_WALL_TIME", {
          family,
          status: response.status,
          elapsedMs: Date.now() - requestStartedAt,
        });
      }

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
