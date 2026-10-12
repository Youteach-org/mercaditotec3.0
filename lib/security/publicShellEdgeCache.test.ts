import { describe, it, expect, vi } from "vitest";
import { isCacheablePublicShell, serveCachedPublicShell } from "./publicShellEdgeCache.mjs";

const htmlRequest = (headers = {}) => new Request("https://mercaditotec.store/marketplace",
  { headers: { accept: "text/html", ...headers } });
const html = () => new Response("<html>Mercadito</html>", {
  headers: { "content-type": "text/html;charset=utf-8" },
});
function cache() {
  const values = new Map();
  return {
    match: vi.fn(async (key) => values.get(key.url)?.clone()),
    put: vi.fn(async (key, response) => { values.set(key.url, response.clone()); }),
  };
}
describe("public Marketplace HTML edge caching", () => {
  it("caches the public HTML and skips a second expensive server render", async () => {
    const source = vi.fn(async () => html());
    const memory = cache();
    const env = { CF_VERSION_METADATA: { id: "deploy-one" } };
    const ctx = { waitUntil: (promise) => promise };
    const first = await serveCachedPublicShell(htmlRequest(), env, ctx, source, memory);
    expect(first.headers.get("x-mercadito-html-cache")).toBe("MISS");
    expect(await first.text()).toContain("Mercadito");
    const second = await serveCachedPublicShell(htmlRequest(), env, ctx, source, memory);
    expect(second.headers.get("x-mercadito-html-cache")).toBe("HIT");
    expect(source).toHaveBeenCalledTimes(1);
    expect(memory.put).toHaveBeenCalledTimes(1);
    const third = await serveCachedPublicShell(htmlRequest(), { CF_VERSION_METADATA: { id: "deploy-two" } }, ctx, source, memory);
    expect(third.headers.get("x-mercadito-html-cache")).toBe("MISS");
  });
  it("never caches cookies, bearer sessions, RSC or private routes", async () => {
    expect(isCacheablePublicShell(htmlRequest({ cookie: "session=a" }))).toBe(false);
    expect(isCacheablePublicShell(htmlRequest({ authorization: "Bearer x" }))).toBe(false);
    expect(isCacheablePublicShell(htmlRequest({ rsc: "1" }))).toBe(false);
    expect(isCacheablePublicShell(htmlRequest({ "next-router-state-tree": "{}" }))).toBe(false);
    expect(isCacheablePublicShell(new Request("https://mercaditotec.store/admin/users",{headers:{accept:"text/html"}}))).toBe(false);
    expect(isCacheablePublicShell(new Request("https://mercaditotec.store/api/admin/users",{headers:{accept:"text/html"}}))).toBe(false);
  });
  it("never caches error pages or responses containing Set-Cookie", async () => {
    const memory = cache(); const context = {waitUntil:(p)=>p};
    await serveCachedPublicShell(htmlRequest(), {}, context,
      async () => new Response("broken",{status:503}), memory);
    await serveCachedPublicShell(htmlRequest(), {}, context,
      async () => new Response("private",{headers:{"content-type":"text/html","set-cookie":"session=abc"}}), memory);
    expect(memory.put).not.toHaveBeenCalled();
  });
});
