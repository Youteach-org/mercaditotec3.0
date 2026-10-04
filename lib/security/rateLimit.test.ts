import { describe, expect, it } from "vitest";

async function advance() {
  const implementation = await import("./rateLimit").catch(() => ({}));
  const fn = (implementation as Record<string, unknown>).nextMutationBudget;
  expect(fn).toBeTypeOf("function");
  return fn as (previous: { window: number; count: number } | undefined, now: number) => { window: number; count: number };
}
describe("persistent mutation budget", () => {
  it("allows sixty operations and rejects the sixty-first in the same minute", async () => {
    const next = await advance();
    let state: { window: number; count: number } | undefined;
    for (let i = 0; i < 60; i++) state = next(state, 120000);
    expect(state).toEqual({ window: 2, count: 60 });
    expect(() => next(state, 120001)).toThrow();
  });
  it("opens a new budget after the minute boundary", async () => {
    expect((await advance())({ window: 2, count: 60 }, 180000)).toEqual({ window: 3, count: 1 });
  });
});
