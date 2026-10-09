import { describe, expect, it } from "vitest";

import { readAdminUsersResponse } from "./response";

describe("Admin users API response", () => {
  it("returns a valid JSON users list", async () => {
    const response = Response.json({ users: [{ uid: "student-1" }] });
    await expect(readAdminUsersResponse(response)).resolves.toEqual([{ uid: "student-1" }]);
  });

  it("preserves the API's JSON error message", async () => {
    const response = Response.json({ error: "No tienes permisos de administrador." }, { status: 403 });
    await expect(readAdminUsersResponse(response)).rejects.toThrow("No tienes permisos de administrador.");
  });

  it("handles upstream HTML without exposing an Unexpected token error", async () => {
    const response = new Response("<!DOCTYPE html><title>Cloudflare error</title>", {
      status: 503,
      headers: { "content-type": "text/html", "cf-ray": "test-ray" },
    });
    await expect(readAdminUsersResponse(response)).rejects.toThrow(
      "el servidor devolvió una página en lugar de datos (HTTP 503). Referencia Cloudflare: test-ray.",
    );
  });

  it("does not pretend an incomplete 200 JSON payload is an empty collection", async () => {
    const response = Response.json({ ok: true });
    await expect(readAdminUsersResponse(response)).rejects.toThrow("lista de usuarios incompleta");
  });

  it("handles invalid JSON with a useful message", async () => {
    const response = new Response("{", {
      status: 502,
      headers: { "content-type": "application/json" },
    });
    await expect(readAdminUsersResponse(response)).rejects.toThrow("JSON inválido (HTTP 502)");
  });
});
