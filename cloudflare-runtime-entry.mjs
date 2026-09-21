const json = (value, init = {}) =>
  new Response(JSON.stringify(value, null, 2), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init.headers || {}),
    },
  });

function serializeError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ? error.stack.split("\n").slice(0, 12).join("\n") : null,
    };
  }

  return {
    name: "UnknownError",
    message: String(error),
    stack: null,
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/__health") {
      return json({
        ok: true,
        stage: "wrapper",
        worker: "mercaditotec3-0",
        firebaseSecretPresent: Boolean(env?.FIREBASE_SERVICE_ACCOUNT_JSON),
      });
    }

    try {
      const openNextModule = await import("./.open-next/worker.js");
      const handler = openNextModule.default;

      if (!handler || typeof handler.fetch !== "function") {
        return json(
          {
            ok: false,
            stage: "opennext-export",
            error: "OpenNext worker default export does not expose fetch().",
            exportedKeys: Object.keys(openNextModule),
          },
          { status: 500 },
        );
      }

      return await handler.fetch(request, env, ctx);
    } catch (error) {
      const details = serializeError(error);
      console.error("[mercadito-cloudflare-runtime]", details);

      return json(
        {
          ok: false,
          stage: "opennext-runtime",
          error: details,
        },
        { status: 500 },
      );
    }
  },
};
