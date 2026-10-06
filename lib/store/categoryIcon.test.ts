import { describe, expect, it } from "vitest";

import {
  inferCategoryIconKey,
  normalizeCategoryIconKey,
} from "./categoryIcon";

describe("category icon keys", () => {
  it("maps cinema and entertainment categories to entertainment", () => {
    expect(inferCategoryIconKey("Cine")).toBe("entertainment");
    expect(inferCategoryIconKey("Entretenimiento")).toBe("entertainment");
  });

  it("maps common approved categories to matching icons", () => {
    expect(inferCategoryIconKey("Comida")).toBe("food");
    expect(inferCategoryIconKey("Bebidas")).toBe("drinks");
    expect(inferCategoryIconKey("Postres")).toBe("desserts");
    expect(inferCategoryIconKey("Papelería")).toBe("stationery");
    expect(inferCategoryIconKey("Ropa y moda")).toBe("clothing");
    expect(inferCategoryIconKey("Tecnología")).toBe("electronics");
  });

  it("uses a neutral icon for unknown legacy categories", () => {
    expect(inferCategoryIconKey("Categoría nueva")).toBe("other");
    expect(normalizeCategoryIconKey("not-real", "Categoría nueva")).toBe("other");
  });
});
