import { describe, expect, it } from "vitest";

async function handler() {
  const implementation = await import("../../supabase/functions/upload-image/handler.mjs").catch(() => ({}));
  const fn = (implementation as Record<string, unknown>).handleUpload;
  expect(fn).toBeTypeOf("function");
  return fn as (request: Request, dependencies: {
    fetch: typeof fetch;
    upload: (path: string, file: File) => Promise<string>;
  }) => Promise<Response>;
}
const path = "chat/student-1/shared/2026-10/test.png";
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
function request(bytes = png, token = "Bearer token") {
  const form = new FormData();
  form.append("path", path);
  form.append("file", new File([bytes], "test.png", { type: "image/png" }));
  return new Request("https://storage.test/upload-image", { method: "POST", headers: { authorization: token }, body: form });
}
function dependencies(status = 200) {
  const uploaded: string[] = [];
  return { uploaded, fetch: (async () => Response.json({ uid: "student-1", path }, { status })) as typeof fetch,
    upload: async (value: string) => { uploaded.push(value); return "https://storage.test/image.png"; } };
}
describe("image function authorization and file validation", () => {
  it("requires a bearer token before writing storage", async () => {
    const deps = dependencies();
    const result = await (await handler())(request(png, ""), deps);
    expect(result.status).toBe(401);
    expect(deps.uploaded).toEqual([]);
  });
  it.each([401, 403, 429])("does not upload when the application denies access with %s", async (status) => {
    const deps = dependencies(status);
    const result = await (await handler())(request(), deps);
    expect(result.status).toBe(status);
    expect(deps.uploaded).toEqual([]);
  });
  it("rejects text disguised as image/png", async () => {
    const deps = dependencies();
    const result = await (await handler())(request(new TextEncoder().encode("<script>alert(1)</script>")), deps);
    expect(result.status).toBe(400);
    expect(deps.uploaded).toEqual([]);
  });
  it("uploads an authorized image to exactly the authorized path", async () => {
    const deps = dependencies();
    const result = await (await handler())(request(), deps);
    expect(result.status).toBe(201);
    expect(deps.uploaded).toEqual([path]);
    expect(await result.json()).toMatchObject({ url: "https://storage.test/image.png" });
  });
  it("limits actual multipart bytes even without content-length", async () => {
    const deps = dependencies();
    const oversized = new Request("https://storage.test/upload-image", {
      method: "POST", headers: { authorization: "Bearer token", "content-type": "multipart/form-data; boundary=test" },
      body: new Uint8Array(1200000),
    });
    const result = await (await handler())(oversized, deps);
    expect(result.status).toBe(413);
    expect(deps.uploaded).toEqual([]);
  });
  it("fails closed when application authorization is unavailable", async () => {
    const deps = dependencies();
    deps.fetch = async () => { throw new Error("internal credential details"); };
    const result = await (await handler())(request(), deps);
    expect(result.status).toBe(503);
    expect(await result.text()).not.toContain("credential");
    expect(deps.uploaded).toEqual([]);
  });
});
