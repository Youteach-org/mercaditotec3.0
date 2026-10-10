import { afterEach, describe, expect, it, vi } from "vitest";
import { getAdminDb, Timestamp } from "../firestoreRest";
import { listActiveCategories } from "./categoryRepository";
import { getMarketplaceContent } from "./marketplaceContentRepository";
import { listPublicStores } from "./publicMarketplaceRepository";
import { getPublicMarketplaceSnapshot, rebuildPublicMarketplaceSnapshot } from "./publicMarketplaceSnapshot";

vi.mock("../firestoreRest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../firestoreRest")>();
  return { ...actual, getAdminDb: vi.fn() };
});
vi.mock("./categoryRepository", () => ({
  listActiveCategories: vi.fn(),
  serializeCategory: (value: { id: string }) => ({ id: value.id }),
}));
vi.mock("./marketplaceContentRepository", () => ({ getMarketplaceContent: vi.fn() }));
vi.mock("./publicMarketplaceRepository", () => ({ listPublicStores: vi.fn() }));

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("shared, materialized public marketplace", () => {
  it("rebuilds on approval revision, including a concurrent approval during refresh", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-08T12:00:00.000Z"));

    let materialized: Record<string, unknown> | null = null;
    const doc = {
      get: vi.fn(async () => ({
        exists: Boolean(materialized),
        data: () => materialized,
      })),
      set: vi.fn(async (value: Record<string, unknown>, options?: { merge?: boolean }) => {
        materialized = options?.merge ? { ...(materialized ?? {}), ...value } : value;
      }),
    };
    vi.mocked(getAdminDb).mockReturnValue({
      collection: () => ({ doc: () => doc }),
    } as unknown as ReturnType<typeof getAdminDb>);
    vi.mocked(listActiveCategories).mockResolvedValue([] as never);
    vi.mocked(getMarketplaceContent).mockResolvedValue({ featuredHeading: "Destacadas" } as never);
    vi.mocked(listPublicStores).mockResolvedValue([{ id: "alfa-rios-3d" }] as never);

    const first = await getPublicMarketplaceSnapshot();
    expect(first.stores.some((store) => store.id === "alfa-rios-3d")).toBe(true);
    expect(listPublicStores).toHaveBeenCalledTimes(1);
    expect(doc.set).toHaveBeenCalledTimes(1);

    // A recent, clean materialization does not re-query stores.
    vi.advanceTimersByTime(2 * 60 * 1000);
    await getPublicMarketplaceSnapshot();
    expect(listPublicStores).toHaveBeenCalledTimes(1);

    // The approval transaction marks the catalogue dirty. A second approval
    // arriving during the read must not be erased by the refresh.
    materialized = { ...(materialized ?? {}), revision: "approved-leo" };
    vi.mocked(listPublicStores).mockImplementation(async () => {
      materialized = { ...(materialized ?? {}), revision: "approved-kratex" };
      return [{ id: "alfa-rios-3d" }, { id: "leo-streaming" }] as never;
    });

    vi.advanceTimersByTime(2 * 60 * 1000);
    const second = await getPublicMarketplaceSnapshot();
    expect(second.stores.some((store) => store.id === "leo-streaming")).toBe(true);
    expect(materialized?.revision).toBe("approved-kratex");
    expect(materialized?.processedRevision).toBe("approved-leo");

    vi.mocked(listPublicStores).mockResolvedValue([
      { id: "alfa-rios-3d" },
      { id: "leo-streaming" },
      { id: "kratex" },
    ] as never);
    vi.advanceTimersByTime(2 * 60 * 1000);
    const third = await getPublicMarketplaceSnapshot();
    expect(third.stores.some((store) => store.id === "kratex")).toBe(true);
    expect(materialized?.processedRevision).toBe("approved-kratex");
    expect(listPublicStores).toHaveBeenCalledTimes(3);

    vi.advanceTimersByTime(2 * 60 * 1000);
    await getPublicMarketplaceSnapshot();
    expect(listPublicStores).toHaveBeenCalledTimes(3);

    vi.mocked(listPublicStores).mockResolvedValue([{ id: "manually-rebuilt" }] as never);
    const manuallyRebuilt = await rebuildPublicMarketplaceSnapshot();
    expect(manuallyRebuilt.stores.some((store) => store.id === "manually-rebuilt")).toBe(true);
  });

  it("keeps the previous published catalogue available if migration refresh fails", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-10T12:00:00.000Z"));
    const previousSnapshot = {
      stores: [{ id: "alfa-rios-3d" }],
      categories: [],
      content: { featuredHeading: "Destacadas" },
      totalStoreCount: 1,
    };
    const oldDocument = {
      exists: true,
      data: () => ({ snapshot: previousSnapshot, generatedAt: Timestamp.now() }),
    };
    const missingDocument = { exists: false, data: () => undefined };
    vi.mocked(getAdminDb).mockReturnValue({
      collection: () => ({
        doc: (id: string) => ({
          get: async () => id === "catalog-v1" ? oldDocument : missingDocument,
          set: vi.fn(),
        }),
      }),
    } as unknown as ReturnType<typeof getAdminDb>);
    vi.mocked(listActiveCategories).mockResolvedValue([] as never);
    vi.mocked(getMarketplaceContent).mockResolvedValue({ featuredHeading: "Destacadas" } as never);
    vi.mocked(listPublicStores).mockRejectedValue(new Error("Temporary Firestore failure"));

    const fallback = await getPublicMarketplaceSnapshot();
    expect(fallback.stores).toEqual(previousSnapshot.stores);
  });
});
