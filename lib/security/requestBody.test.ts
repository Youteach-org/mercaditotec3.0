import { describe, expect, it } from "vitest";

async function guard() {
  const implementation = await import("./requestBody.mjs").catch(() => ({}));
  const fn = (implementation as Record<string, unknown>).boundApiRequest;
  expect(fn).toBeTypeOf("function");
  return fn as (request: Request) => Promise<Request>;
}
describe("API request body boundary", () => {
  it("preserves small JSON requests and authorization", async () => {
    const result = await (await guard())(new Request("https://mercadito.test/api/orders", { method: "POST", headers: { authorization: "Bearer token", "content-type": "application/json" }, body: '{"quantity":1}' }));
    expect(await result.json()).toEqual({ quantity: 1 });
    expect(result.headers.get("authorization")).toBe("Bearer token");
  });
  it("rejects actual oversized bytes without relying on content-length", async () => {
    const req = new Request("https://mercadito.test/api/orders", { method: "POST", body: new Uint8Array(65537) });
    await expect((await guard())(req)).rejects.toMatchObject({ status: 413 });
  });
  it("does not impose the API body limit on page requests", async () => {
    const req = new Request("https://mercadito.test/marketplace");
    expect(await (await guard())(req)).toBe(req);
  });
});
