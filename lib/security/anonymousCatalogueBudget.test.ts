import { it, expect, vi } from "vitest";
import { enforceEdgeBudget } from "./edgeBudget.mjs";

it("does not hit the stateful limiter for anonymous cacheable catalogue GETs", async () => {
  const limit = vi.fn(async () => ({success: true}));
  const env = {API_RATE_LIMITER: {limit}};
  expect(await enforceEdgeBudget(new Request("https://site.test/api/marketplace-v2"),env)).toBeNull();
  expect(limit).not.toHaveBeenCalled();
  await enforceEdgeBudget(new Request("https://site.test/api/marketplace-v2",{
    headers:{cookie:"session=abc"}
  }),env);
  expect(limit).toHaveBeenCalledTimes(1);
});
