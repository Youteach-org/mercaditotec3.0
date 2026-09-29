import { describe, expect, it } from "vitest";

import { shouldUseMarketplaceDemo } from "./marketplacePreview";

describe("shouldUseMarketplaceDemo", () => {
  it("enables demo mode when visual=1 is present", () => {
    expect(shouldUseMarketplaceDemo("?visual=1", "example.com")).toBe(true);
  });

  it("enables demo mode automatically on the isolated preview Worker", () => {
    expect(
      shouldUseMarketplaceDemo(
        "",
        "mercaditotec-preview.youteach-tk.workers.dev",
      ),
    ).toBe(true);
  });

  it("does not force demo mode on production hosts", () => {
    expect(
      shouldUseMarketplaceDemo(
        "",
        "mercaditotec3-0.youteach-tk.workers.dev",
      ),
    ).toBe(false);
  });
});
