import { afterEach, describe, expect, it, vi } from "vitest";
import { authorizeImageUpload } from "./mediaAuthorization";
vi.mock("../firebaseAdmin", () => ({ getAdminAccessToken: async () => "test-service-token", getFirebaseProjectId: () => "test-project" }));
afterEach(() => vi.unstubAllGlobals());

function database(storeOwner = "student-1", productOwner = "student-1", productStore = "store-1", status = "active") {
  vi.stubGlobal("fetch", async (input: string) => {
    const product = new URL(input).pathname.includes("/products/");
    return Response.json({
      name: "projects/test-project/databases/(default)/documents/" + (product ? "products/product-1" : "stores/store-1"),
      fields: {
        ownerUid: { stringValue: product ? productOwner : storeOwner },
        storeId: { stringValue: productStore }, status: { stringValue: status },
        createdAt: { timestampValue: "2026-10-02T00:00:00Z" }, updatedAt: { timestampValue: "2026-10-02T00:00:00Z" },
      },
    });
  });
}
describe("server upload resource ownership", () => {
  it("allows uploads for an owned editable store", async () => {
    database();
    await expect(authorizeImageUpload("student-1", "stores/student-1/store-1/logo/x.png")).resolves.toBeUndefined();
  });
  it("rejects a store belonging to somebody else even under the actor's storage prefix", async () => {
    database("victim");
    await expect(authorizeImageUpload("student-1", "stores/student-1/store-1/logo/x.png")).rejects.toMatchObject({ status: 404 });
  });
  it("rejects media uploads while a store is under review", async () => {
    database("student-1", "student-1", "store-1", "pending_review");
    await expect(authorizeImageUpload("student-1", "stores/student-1/store-1/logo/x.png")).rejects.toMatchObject({ status: 409 });
  });
  it.each([["victim", "store-1"], ["student-1", "other-store"]])("rejects a product with incompatible ownership: %s, %s", async (owner, store) => {
    database("student-1", owner, store);
    await expect(authorizeImageUpload("student-1", "stores/student-1/store-1/products/product-1/x.png")).rejects.toMatchObject({ status: 404 });
  });
});

it("allows owner-bound community image uploads without store lookup", async () => {
  vi.stubGlobal("fetch", async () => {
    throw new Error("community upload must not query Firestore");
  });

  await expect(
    authorizeImageUpload("student-1", "community-posts/student-1/x.png"),
  ).resolves.toBeUndefined();

  await expect(
    authorizeImageUpload("student-1", "community-posts/victim/x.png"),
  ).rejects.toThrow();
});
