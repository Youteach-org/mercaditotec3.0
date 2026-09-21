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
      stack: error.stack ? error.stack.split("\n").slice(0, 16).join("\n") : null,
    };
  }

  return {
    name: "UnknownError",
    message: String(error),
    stack: null,
  };
}

function serializeConsoleArg(value) {
  if (value instanceof Error) return serializeError(value);

  if (typeof value === "string") return value;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

async function loadOpenNext() {
  const openNextModule = await import("./.open-next/worker.js");
  const handler = openNextModule.default;

  if (!handler || typeof handler.fetch !== "function") {
    throw new Error(
      `OpenNext worker default export does not expose fetch(). Exported keys: ${Object.keys(openNextModule).join(", ")}`,
    );
  }

  return { handler, exportedKeys: Object.keys(openNextModule) };
}

async function probeOpenNext(request, env, ctx) {
  const captured = [];
  const originals = {
    error: console.error,
    warn: console.warn,
    log: console.log,
  };

  const capture = (level) => (...args) => {
    captured.push({
      level,
      args: args.map(serializeConsoleArg),
    });
    originals[level](...args);
  };

  console.error = capture("error");
  console.warn = capture("warn");
  console.log = capture("log");

  try {
    const { handler, exportedKeys } = await loadOpenNext();
    const targets = ["/", "/marketplace", "/api/marketplace"];
    const results = [];

    for (const pathname of targets) {
      try {
        const targetUrl = new URL(pathname, request.url);
        const targetRequest = new Request(targetUrl.toString(), {
          method: "GET",
          headers: request.headers,
          redirect: "manual",
        });

        const response = await handler.fetch(targetRequest, env, ctx);
        const body = await response.clone().text();

        results.push({
          pathname,
          status: response.status,
          statusText: response.statusText,
          location: response.headers.get("location"),
          contentType: response.headers.get("content-type"),
          bodySample: body.slice(0, 3000),
        });
      } catch (error) {
        results.push({
          pathname,
          thrown: serializeError(error),
        });
      }
    }

    return {
      ok: true,
      stage: "opennext-probe",
      exportedKeys,
      results,
      capturedConsole: captured.slice(-50),
    };
  } catch (error) {
    return {
      ok: false,
      stage: "opennext-import",
      error: serializeError(error),
      capturedConsole: captured.slice(-50),
    };
  } finally {
    console.error = originals.error;
    console.warn = originals.warn;
    console.log = originals.log;
  }
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

    if (url.pathname === "/__probe") {
      return json(await probeOpenNext(request, env, ctx));
    }

    try {
      const { handler } = await loadOpenNext();
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
