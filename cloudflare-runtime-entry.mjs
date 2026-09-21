// deploy-with-startup-eval
import openNextWorker, * as openNextModule from "./.open-next/worker.js";

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

function getHandler() {
  if (!openNextWorker || typeof openNextWorker.fetch !== "function") {
    throw new Error(
      `OpenNext worker default export does not expose fetch(). Exported keys: ${Object.keys(openNextModule).join(", ")}`,
    );
  }

  return openNextWorker;
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
    const handler = getHandler();
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
      exportedKeys: Object.keys(openNextModule),
      results,
      capturedConsole: captured.slice(-50),
    };
  } catch (error) {
    return {
      ok: false,
      stage: "opennext-runtime",
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
        openNextLoadedAtStartup: true,
        exportedKeys: Object.keys(openNextModule),
      });
    }

    if (url.pathname === "/__probe") {
      return json(await probeOpenNext(request, env, ctx));
    }

    try {
      return await getHandler().fetch(request, env, ctx);
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
