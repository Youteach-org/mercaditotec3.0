import { afterEach, describe, expect, it, vi } from "vitest";
import { getAdminDb } from "../firestoreRest";
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
  it("rebuilds on first load, reuses one persisted document on cache expiry, and refreshes after a mutation", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-08T12:00:00.000Z"));

    let materialized: Record<string, unknown> | null = null;
    const doc = {
      get: vi.fn(async () => ({
        exists: Boolean(materialized),
        data: () => materialized,
      })),
      set: vi.fn(async (value: Record<string, unknown>) => { materialized = value; }),
    };
    vi.mocked(getAdminDb).mockReturnValue({
      collection: () => ({ doc: () => doc }),
    } as unknown as ReturnType<typeof getAdminDb>);
    vi.mocked(listActiveCategories).mockResolvedValue([] as never);
    vi.mocked(getMarketplaceContent).mockResolvedValue({ featuredHeading: "Destacadas" } as never);
    vi.mocked(listPublicStores).mockResolvedValue([{ id: "shop-first" }] as never);

    const first = await getPublicMarketplaceSnapshot();
    expect(first.stores.some((store) => store.id === "shop-first")).toBe(true);
    expect(listPublicStores).toHaveBeenCalledTimes(1);
    expect(doc.set).toHaveBeenCalledTimes(1);

    // The five-minute edge/memory TTL is NOT an expensive re-query timer.
    vi.advanceTimersByTime(6 * 60 * 1000);
    const second = await getPublicMarketplaceSnapshot();
    expect(second.stores.some((store) => store.id === "shop-first")).toBe(true);
    expect(listPublicStores).toHaveBeenCalledTimes(1);
    expect(doc.get).toHaveBeenCalledTimes(2);

    // A legitimate catalogue mutation triggers exactly one regeneration.
    vi.mocked(listPublicStores).mockResolvedValue([{ id: "shop-updated" }] as never);
    await rebuildPublicMarketplaceSnapshot();
    vi.advanceTimersByTime(6 * 60 * 1000);
    const third = await getPublicMarketplaceSnapshot();
    expect(third.stores.some((store) => store.id === "shop-updated")).toBe(true);
    expect(listPublicStores).toHaveBeenCalledTimes(2);
    expect(doc.set).toHaveBeenCalledTimes(2);
  });
});
