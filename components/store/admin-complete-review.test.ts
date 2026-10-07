import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const adminPage = readFileSync(
  join(root, "app", "admin", "stores", "[storeId]", "page.tsx"), "utf8",
);
const allDetails = readFileSync(
  join(root, "components", "store", "AdminCompleteStoreReview.tsx"), "utf8",
);
const api = readFileSync(
  join(root, "app", "api", "admin", "stores", "[storeId]", "route.ts"), "utf8",
);
const productsRepository = readFileSync(
  join(root, "lib", "store", "productRepository.ts"), "utf8",
);

describe("admin full store review before approval", () => {
  it("loads the complete store, all products and category taxonomy together", () => {
    expect(api).toContain("listProductsForAdmin(storeId)");
    expect(api).toContain("listAllCategories()");
    expect(api).toContain("products: products.map(serializeProduct)");
    expect(api).toContain("owner:");
    expect(api).toContain('collection("users").doc(store.ownerUid)');
    expect(adminPage).toContain("setProducts(Array.isArray(data.products)");
    expect(adminPage).toContain("setCategories(Array.isArray(data.categories)");
    expect(adminPage).toContain("setOwner(data.owner");
    expect(adminPage).toContain("<AdminCompleteStoreReview");
    expect(productsRepository).toContain('export async function listProductsForAdmin');
    const start = productsRepository.indexOf("export async function listProductsForAdmin");
    const end = productsRepository.indexOf("export async function promoteSuggestedCategoriesForStore",start);
    expect(productsRepository.slice(start,end)).not.toContain(".limit(");
  });

  it("shows every product with every image, even hidden ones, rather than the 1st image/1st product", () => {
    expect(allDetails).toContain("products.map((product, index)");
    expect(allDetails).toContain("product.imageUrls.map((url, photoIndex)");
    expect(allDetails).toContain('product.visibility === "published"');
    expect(allDetails).toContain("product.description");
    expect(allDetails).toContain("priceLabel(product)");
    expect(allDetails).not.toContain("products.slice(");
    expect(allDetails).not.toContain("product.imageUrls[0]");
    expect(allDetails).toContain("Categoría aprobada:");
    expect(allDetails).toContain("Categoría propuesta:");
  });

  it("includes all stored store information and seller verification", () => {
    for (const field of [
      "store.description", "store.deliveryLocation", "store.name",
      "store.logoUrl", "store.coverUrl", "store.operationalMode",
      "store.manualOpen", "store.marketplaceLabel", "store.marketplaceNote",
      "store.marketplaceTags", "store.marketplaceVariant",
      "store.reviewMessage", "store.suspensionReason",
      "store.createdAt", "store.updatedAt", "store.approvedAt",
    ]) expect(allDetails).toContain(field);
    expect(allDetails).toContain("owner?.studentStatus");
    expect(allDetails).toContain("owner?.endorsementCount");
    expect(allDetails).toContain("StoreScheduleGrid");
    expect(allDetails).toContain("STORE_WEEK_DAYS.map((day)");
    expect(allDetails).toContain("MarketplaceCardEditorPreview");
    expect(allDetails).toContain("StorefrontPreview");
  });

  it("does not enable Approve until admin confirms inspecting full store", () => {
    expect(adminPage).toContain("reviewConfirmed");
    expect(adminPage).toContain('action === "approve" && (!reviewConfirmed || products.length === 0)');
    expect(adminPage).toContain("Revisé la tienda COMPLETA");
    expect(adminPage).toContain("setReviewConfirmed(false)");
    expect(adminPage).toContain('action === "changes_required"');
  });
});
