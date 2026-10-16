import { describe, expect, it } from "vitest";
import { ratingBadgeCandidates, ratingBadgeOverlapArea } from "./ratingBadgePlacement";

function box(left: number, top: number, width: number, height: number) {
  return { left, right: left + width, top, bottom: top + height };
}

describe("collision-safe storefront rating badges", () => {
  it("searches multiple areas of the cloud instead of hard-coding the name's position", () => {
    const cloud = { left: 5, top: 4, width: 305, height: 225 };
    const badge = { width: 92, height: 29 };
    const candidates = ratingBadgeCandidates(cloud, badge);
    expect(candidates.length).toBeGreaterThan(12);
    for (const point of candidates) {
      expect(point.left - badge.width / 2).toBeGreaterThan(cloud.left + 4);
      expect(point.left + badge.width / 2).toBeLessThan(cloud.left + cloud.width - 4);
      expect(point.top).toBeGreaterThanOrEqual(cloud.top + cloud.height * 0.12);
      expect(point.top + badge.height).toBeLessThan(cloud.top + cloud.height * 0.9);
    }
  });

  it("provides a free position when title and description occupy opposite parts of a cloud", () => {
    const cloud = { left: 4, top: 3, width: 320, height: 230 };
    const badge = { width: 100, height: 28 };
    const title = box(0, 0, 300, 126);
    const description = box(0, 194, 320, 120);
    const logo = box(251, 155, 55, 55);
    const handNote = box(231, 182, 72, 40);
    const free = ratingBadgeCandidates(cloud, badge).find((point) => {
      const candidate = box(point.left - badge.width / 2, point.top, badge.width, badge.height);
      return [title, description, logo, handNote].every((obstacle) => ratingBadgeOverlapArea(candidate, obstacle) === 0);
    });
    expect(free).toBeDefined();
  });

  it("does not report intersections between separated rectangles", () => {
    expect(ratingBadgeOverlapArea(box(0, 0, 50, 28), box(70, 0, 60, 32))).toBe(0);
    expect(ratingBadgeOverlapArea(box(0, 0, 50, 28), box(40, 20, 50, 20))).toBeGreaterThan(0);
  });

  it("allows no position for a cloud too small to contain the badge", () => {
    expect(ratingBadgeCandidates(
      { left: 0, top: 0, width: 55, height: 42 },
      { width: 96, height: 30 },
    )).toEqual([]);
  });
});
