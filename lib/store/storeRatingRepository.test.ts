import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminDb } from "../firestoreRest";
import { getStoreRatingForUser, saveStoreRatingForUser } from "./storeRatingRepository";

vi.mock("../firestoreRest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../firestoreRest")>();
  return { ...actual, getAdminDb: vi.fn() };
});

type StoredData = Record<string, unknown>;
const docs = new Map<string, StoredData>();
const writes: string[] = [];

function reference(path: string) {
  return {
    path,
    get: async () => ({ exists: docs.has(path), data: () => docs.get(path) }),
    collection: (name: string) => ({ doc: (id: string) => reference(`${path}/${name}/${id}`) }),
  };
}

beforeEach(() => {
  docs.clear();
  writes.length = 0;
  docs.set("stores/shop-one", { ownerUid: "seller-1", status: "active" });
  vi.mocked(getAdminDb).mockReturnValue({
    collection: (name: string) => ({ doc: (id: string) => reference(`${name}/${id}`) }),
    runTransaction: async (callback: (transaction: unknown) => Promise<unknown>) => {
      const staged: Array<() => void> = [];
      const transaction = {
        get: async (ref: { path: string }) => ({
          exists: docs.has(ref.path),
          data: () => docs.get(ref.path),
        }),
        set: (ref: { path: string }, data: StoredData, options?: { merge?: boolean }) => {
          staged.push(() => {
            docs.set(ref.path, options?.merge ? { ...docs.get(ref.path), ...data } : data);
            writes.push(ref.path);
          });
        },
        update: (ref: { path: string }, data: StoredData) => {
          staged.push(() => {
            docs.set(ref.path, { ...docs.get(ref.path), ...data });
            writes.push(ref.path);
          });
        },
      };
      const result = await callback(transaction);
      staged.forEach((apply) => apply());
      return result;
    },
  } as unknown as ReturnType<typeof getAdminDb>);
});

describe("rating transaction", () => {
  it("links exactly one value to each account and updates totals on edits", async () => {
    expect(await getStoreRatingForUser("shop-one", "buyer-1")).toMatchObject({
      ratingAverage: null, ratingCount: 0, ownRating: null, canRate: true,
    });
    expect(await saveStoreRatingForUser("shop-one", "buyer-1", 5)).toMatchObject({
      ratingAverage: 5, ratingCount: 1, ownRating: 5,
    });
    expect(await saveStoreRatingForUser("shop-one", "buyer-2", 3)).toMatchObject({
      ratingAverage: 4, ratingCount: 2, ownRating: 3,
    });
    const changed = await saveStoreRatingForUser("shop-one", "buyer-1", 1);
    expect(changed).toMatchObject({
      ratingAverage: 2, ratingCount: 2, ratingDistribution: [1, 0, 1, 0, 0], ownRating: 1,
    });
    expect(docs.get("stores/shop-one/ratings/buyer-1")?.value).toBe(1);
    expect(docs.get("stores/shop-one/ratings/buyer-2")?.value).toBe(3);
    expect(docs.get("public_marketplace_cache/catalog-v2")?.revision).toEqual(expect.any(String));
    const writesBefore = writes.length;
    await saveStoreRatingForUser("shop-one", "buyer-1", 1);
    expect(writes).toHaveLength(writesBefore);
  });

  it("rejects ratings from the owner and for unavailable stores", async () => {
    await expect(saveStoreRatingForUser("shop-one", "seller-1", 5)).rejects.toMatchObject({ status: 403 });
    expect(writes).toHaveLength(0);
    docs.set("stores/shop-one", { ownerUid: "seller-1", status: "suspended" });
    await expect(saveStoreRatingForUser("shop-one", "buyer-1", 5)).rejects.toMatchObject({ status: 404 });
    await expect(getStoreRatingForUser("shop-one", "buyer-1")).rejects.toMatchObject({ status: 404 });
    expect(writes).toHaveLength(0);
  });
});
