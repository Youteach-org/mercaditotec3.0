import { describe, expect, it } from "vitest";
import { featuredPriorityBrand, orderMarketplaceFeatured } from "./featuredMarketplace";

type Shop = { id: string; name: string; slug: string };
const shop = (id: string, name = id, slug = id): Shop => ({ id, name, slug });
const date = new Date("2026-10-25T16:00:00.000Z");

const real = [
  ...Array.from({ length: 18 }, (_, index) => shop(`shop-${index}`)),
  shop("ke-original", "Ke-Rollos!", "k-rollos"),
  shop("yt-original", "You Teach", "youteach"),
];

describe("fair Tiendas rotation with Ke-Rollos! and YouTeach in first nine", () => {
  it("recognizes Ke-Rollos! official slug and YouTeach's future aliases", () => {
    expect(featuredPriorityBrand(shop("kr", "Ke-Rollos!", "k-rollos"))).toBe("ke-rollos");
    expect(featuredPriorityBrand(shop("kr", "Rollos de sushi", "ke-rollos"))).toBe("ke-rollos");
    expect(featuredPriorityBrand(shop("yt", "YouTeach", "youteach"))).toBe("youteach");
    expect(featuredPriorityBrand(shop("yt", "You Teach", "you-teach"))).toBe("youteach");
    expect(featuredPriorityBrand(shop("other", "Cositas Culs", "cositas"))).toBeNull();
  });

  it("keeps each priority brand somewhere in the FIRST NINE, not always among first six", () => {
    const kePositions = new Set<number>();
    const ytPositions = new Set<number>();
    for (let seed = 0; seed < 150; seed++) {
      const result = orderMarketplaceFeatured(real, date, seed);
      const ke = result.findIndex((store) => store.slug === "k-rollos");
      const yt = result.findIndex((store) => store.slug === "youteach");
      expect(ke).toBeGreaterThanOrEqual(0);
      expect(ke).toBeLessThan(9);
      expect(yt).toBeGreaterThanOrEqual(0);
      expect(yt).toBeLessThan(9);
      expect(ke).not.toBe(yt);
      expect(result.map((store) => store.id).sort()).toEqual(real.map((store) => store.id).sort());
      kePositions.add(ke);
      ytPositions.add(yt);
    }
    expect(kePositions.size).toBe(9);
    expect(ytPositions.size).toBe(9);
    expect([...kePositions].some((index) => index >= 6)).toBe(true);
  });

  it("rotates every ordinary shop rather than leaving nonfeatured stores in alphabetical order", () => {
    const positions = new Map<string, Set<number>>();
    for (let seed = 0; seed < 150; seed++) {
      const result = orderMarketplaceFeatured(real, date, seed);
      result.forEach((store, index) => {
        const set = positions.get(store.id) ?? new Set<number>();
        set.add(index);
        positions.set(store.id, set);
      });
    }
    for (const store of real) {
      expect(positions.get(store.id)?.size).toBeGreaterThan(5);
    }
    expect(positions.get("shop-17")?.has(0)).toBe(true);
  });

  it("is stable for the same visit, including after source-order changes", () => {
    const a = orderMarketplaceFeatured(real, date, 8675309).map((s) => s.id);
    const b = orderMarketplaceFeatured(real, date, 8675309).map((s) => s.id);
    expect(a).toEqual(b);
    expect(orderMarketplaceFeatured(real, date, 8675310).map((s) => s.id)).not.toEqual(a);
  });

  it("reserves YouTeach only when approved and present in the public listing", () => {
    const without = real.filter((store) => store.slug !== "youteach");
    for (let seed = 0; seed < 30; seed++) {
      const ordered = orderMarketplaceFeatured(without, date, seed);
      expect(ordered.findIndex((s) => s.slug === "k-rollos")).toBeLessThan(9);
      expect(ordered.some((s) => s.slug === "youteach")).toBe(false);
    }
    const withYouTeach = orderMarketplaceFeatured(
      [...without, shop("youteach", "YouTeach", "you-teach")], date, 143,
    );
    expect(withYouTeach.findIndex((s) => s.id === "youteach")).toBeLessThan(9);
  });

  it("does not allow demo stores to displace published shops", () => {
    const demos = Array.from({ length: 12 }, (_, i) => shop(`demo-${i}`, `Demo ${i}`));
    const ordered = orderMarketplaceFeatured([...demos, ...real], date, 56);
    expect(ordered.slice(0, real.length).every((s) => !s.id.startsWith("demo-"))).toBe(true);
    expect(ordered.slice(real.length).every((s) => s.id.startsWith("demo-"))).toBe(true);
  });

  it("fills empty slots with demos when few published shops exist", () => {
    const demos = Array.from({ length: 10 }, (_, i) => shop(`demo-${i}`));
    const result = orderMarketplaceFeatured([shop("kr", "Ke-Rollos!", "k-rollos"), ...demos], date, 1);
    expect(result[0]?.id).toBe("kr");
    expect(result).toHaveLength(11);
  });

  it("never introduces a store missing from the selected search/category results", () => {
    const filtered = real.filter((s) => s.id.startsWith("shop-1"));
    const ordered = orderMarketplaceFeatured(filtered, date, 33);
    expect(ordered).toHaveLength(filtered.length);
    expect(ordered.every((s) => filtered.some((x) => x.id === s.id))).toBe(true);
    expect(ordered.some((s) => s.id === "ke-original" || s.id === "yt-original")).toBe(false);
  });
});
