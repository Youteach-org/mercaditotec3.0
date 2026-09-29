import { describe, expect, it } from "vitest";

import {
  marketplaceVariantIndex,
  resolveMarketplaceVariant,
} from "./marketplacePresentation";

describe("marketplace presentation", () => {
  it("respects an explicitly selected cloud shape", () => {
    expect(resolveMarketplaceVariant("cloud-5", "store-123")).toBe("cloud-5");
    expect(marketplaceVariantIndex("cloud-5")).toBe(4);
  });

  it("assigns a stable automatic shape to stores without a selection", () => {
    const first = resolveMarketplaceVariant(null, "store-new-123");
    const second = resolveMarketplaceVariant(null, "store-new-123");

    expect(second).toBe(first);
    expect(["cloud-1", "cloud-2", "cloud-3", "cloud-4", "cloud-5", "cloud-6"]).toContain(first);
  });

  it("spreads different store ids across the available shapes", () => {
    const variants = new Set(
      ["a", "b", "c", "d", "e", "f", "g", "h"].map((id) =>
        resolveMarketplaceVariant(null, `store-${id}`),
      ),
    );

    expect(variants.size).toBeGreaterThan(1);
  });
});
