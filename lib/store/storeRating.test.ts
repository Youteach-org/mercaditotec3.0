import { describe, expect, it } from "vitest";
import {
  compactStoreRating,
  dominantStoreRating,
  parseStoreRatingValue,
  publicStoreRatingStats,
  readStoreRatingStats,
  StoreRatingError,
  updateStoreRatingStats,
} from "./storeRating";

describe("store emoji ratings", () => {
  it("only accepts integer levels 1–5", () => {
    for (const choice of [1, 2, 3, 4, 5]) expect(parseStoreRatingValue(choice)).toBe(choice);
    for (const invalid of [0, 6, 2.5, "5", true, null, undefined, NaN]) {
      expect(() => parseStoreRatingValue(invalid)).toThrow(StoreRatingError);
    }
  });

  it("formats a rating as the matching emoji plus one whole number", () => {
    expect(compactStoreRating(5)).toEqual({ emoji: "😍", score: 5 });
    expect(compactStoreRating(4.7)).toEqual({ emoji: "😍", score: 5 });
    expect(compactStoreRating(4.2)).toEqual({ emoji: "😊", score: 4 });
    expect(compactStoreRating(2.3)).toEqual({ emoji: "😕", score: 2 });
    expect(compactStoreRating(null)).toBeNull();
    expect(compactStoreRating(NaN)).toBeNull();
  });

  it("starts empty and computes a new vote without duplicates", () => {
    const initial = readStoreRatingStats(undefined);
    expect(publicStoreRatingStats(initial)).toEqual({
      ratingAverage: null, ratingCount: 0, ratingDistribution: [0, 0, 0, 0, 0],
    });
    const first = updateStoreRatingStats(initial, null, 5);
    expect(first).toEqual({ count: 1, total: 5, distribution: [0, 0, 0, 0, 1] });
    expect(updateStoreRatingStats(first, 5, 5)).toBe(first);
    expect(publicStoreRatingStats(first).ratingAverage).toBe(5);
  });

  it("replaces a user's previous vote without increasing the number of voters", () => {
    let stats = updateStoreRatingStats(readStoreRatingStats(undefined), null, 5);
    stats = updateStoreRatingStats(stats, null, 3);
    stats = updateStoreRatingStats(stats, 3, 1);
    expect(stats).toEqual({ count: 2, total: 6, distribution: [1, 0, 0, 0, 1] });
    expect(publicStoreRatingStats(stats).ratingAverage).toBe(3);
    expect(dominantStoreRating(publicStoreRatingStats(stats))).toBe(5);
  });

  it("does not trust malformed persisted counts", () => {
    expect(readStoreRatingStats({ count: 5, total: 100, distribution: [0, 0, 0, 0, 5] }).count).toBe(0);
    expect(readStoreRatingStats({ count: 1, total: 5, distribution: [0, 0, 0, 0, 1] }).count).toBe(1);
    expect(() => updateStoreRatingStats(readStoreRatingStats(undefined), 4, 3)).toThrow(StoreRatingError);
  });
});
