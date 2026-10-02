// security-hardened production wrapper
import openNextWorker from "./.open-next/worker.js";

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
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/__health") {
      return json({ ok: true });
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
      return await getHandler().fetch(request, env, ctx);
    } catch (error) {
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
