import { describe, expect, it } from "vitest";
import { featuredPriorityBrand, orderMarketplaceFeatured } from "./featuredMarketplace";

type Shop = { id: string; name: string; slug: string };
const shop = (id: string, name = id, slug = id): Shop => ({ id, name, slug });
const date = new Date("2026-10-13T16:00:00.000Z");

const real = [
  shop("a", "Alfa"), shop("b", "Bravo"), shop("c", "Cositas"),
  shop("d", "Dulces"), shop("e", "El Rincón"), shop("f", "Frutas"),
  shop("g", "Galletas"), shop("ke-original", "Ke-Rollos!", "k-rollos"),
  shop("h", "Hamburguesas"), shop("yt-original", "You Teach", "youteach"),
  shop("i", "Innovación"),
];

describe("Marketplace 6-featured reserved positions", () => {
  it("recognizes the actual Ke-Rollos! public slug and YouTeach aliases", () => {
    expect(featuredPriorityBrand(shop("kr", "Ke-Rollos!", "k-rollos"))).toBe("ke-rollos");
    expect(featuredPriorityBrand(shop("kr", "Rollos de sushi", "ke-rollos"))).toBe("ke-rollos");
    expect(featuredPriorityBrand(shop("yt", "YouTeach", "youteach"))).toBe("youteach");
    expect(featuredPriorityBrand(shop("yt", "You Teach", "you-teach"))).toBe("youteach");
    expect(featuredPriorityBrand(shop("other", "Cositas Culs", "cositas"))).toBeNull();
  });

  it("always includes both approved brands within the first six even when listed later", () => {
    for (let day = 1; day <= 30; day++) {
      const ordered = orderMarketplaceFeatured(real, new Date(2026, 9, day, 12));
      const topSix = ordered.slice(0, 6);
      expect(topSix.some((store) => store.slug === "k-rollos")).toBe(true);
      expect(topSix.some((store) => store.slug === "youteach")).toBe(true);
      expect(new Set(ordered.map((store) => store.id)).size).toBe(real.length);
      expect(ordered).toHaveLength(real.length);
    }
  });

  it("reserves YouTeach before it is created, without inventing a public draft listing", () => {
    const withoutYouTeach = real.filter((store) => store.slug !== "youteach");
    const ordered = orderMarketplaceFeatured(withoutYouTeach, date);
    expect(ordered.slice(0, 6).some((store) => store.slug === "k-rollos")).toBe(true);
    expect(ordered.some((store) => store.slug === "youteach")).toBe(false);
    expect(ordered).toHaveLength(withoutYouTeach.length);
    // The rule takes effect automatically when an approved YouTeach appears.
    const newlyApproved = orderMarketplaceFeatured([...withoutYouTeach, shop("yt", "YouTeach", "you-teach")], date);
    expect(newlyApproved.slice(0, 6).some((store) => store.id === "yt")).toBe(true);
  });

  it("keeps demo shops out of the six featured positions when six real stores exist", () => {
    const demos = Array.from({ length: 12 }, (_, i) => shop(`demo-${i}`, `Demo ${i}`));
    const ordered = orderMarketplaceFeatured([...demos, ...real], date);
    expect(ordered.slice(0, 6).every((store) => !store.id.startsWith("demo-"))).toBe(true);
    expect(ordered).toHaveLength(demos.length + real.length);
  });

  it("fills the six places with demos only when too few published stores exist", () => {
    const demos = Array.from({ length: 10 }, (_, i) => shop(`demo-${i}`));
    const ordered = orderMarketplaceFeatured([shop("kr", "Ke-Rollos!", "k-rollos"), ...demos], date);
    expect(ordered.slice(0, 6).filter((store) => store.id === "kr")).toHaveLength(1);
    expect(ordered.slice(0, 6).filter((store) => store.id.startsWith("demo-"))).toHaveLength(5);
  });

  it("is identical within the local day and varies store slots between days", () => {
    const first = orderMarketplaceFeatured(real, date).map((store) => store.id);
    const same = orderMarketplaceFeatured(real, new Date(date.getTime() + 3_600_000)).map((store) => store.id);
    expect(first).toEqual(same);
    const kePositions = new Set<number>();
    const ytPositions = new Set<number>();
    for (let d = 13; d < 30; d++) {
      const six = orderMarketplaceFeatured(real, new Date(2026, 9, d, 14)).slice(0, 6);
      kePositions.add(six.findIndex((store) => store.id === "ke-original"));
      ytPositions.add(six.findIndex((store) => store.id === "yt-original"));
    }
    expect(kePositions.size).toBeGreaterThan(1);
    expect(ytPositions.size).toBeGreaterThan(1);
  });

  it("never brings a nonmatching store into active search/category filters", () => {
    const searchResults = real.filter((store) => store.name.toLowerCase().includes("fru"));
    const ordered = orderMarketplaceFeatured(searchResults, date);
    expect(ordered).toHaveLength(searchResults.length);
    expect(ordered.some((store) => store.slug === "k-rollos" || store.slug === "youteach")).toBe(false);
  });
});
