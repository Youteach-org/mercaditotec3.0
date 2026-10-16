/** Candidate positions for the tiny emoji badge INSIDE the cover cloud.
 * Measured in CSS pixels relative to the store slot. The actual browser
 * rectangles are checked against ribbon, description, logo, and hand note,
 * so different store names and landscape viewports do not obscure text.
 */
export interface RatingBadgeBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface RatingBadgePosition {
  left: number;
  top: number;
}

export function ratingBadgeCandidates(
  cloud: RatingBadgeBounds,
  badge: { width: number; height: number },
): RatingBadgePosition[] {
  const xStops = [0.23, 0.77, 0.5, 0.32, 0.68];
  const yStops = [0.52, 0.61, 0.41, 0.32, 0.23];
  const horizontalMargin = Math.max(6, cloud.width * 0.07);
  const minCenterX = cloud.left + horizontalMargin + badge.width / 2;
  const maxCenterX = cloud.left + cloud.width - horizontalMargin - badge.width / 2;
  const minTop = cloud.top + cloud.height * 0.12;
  const maxTop = cloud.top + cloud.height * 0.89 - badge.height;
  if (minCenterX > maxCenterX || minTop > maxTop) return [];

  const candidates: RatingBadgePosition[] = [];
  for (const y of yStops) {
    for (const x of xStops) {
      const left = Math.min(maxCenterX, Math.max(minCenterX, cloud.left + cloud.width * x));
      const top = Math.min(maxTop, Math.max(minTop, cloud.top + cloud.height * y));
      if (!candidates.some((candidate) =>
        Math.abs(candidate.left - left) < 1 && Math.abs(candidate.top - top) < 1)) {
        candidates.push({ left, top });
      }
    }
  }
  return candidates;
}

export function ratingBadgeOverlapArea(
  a: Pick<DOMRect, "left" | "right" | "top" | "bottom">,
  b: Pick<DOMRect, "left" | "right" | "top" | "bottom">,
  padding = 5,
): number {
  const overlapWidth = Math.max(0, Math.min(a.right, b.right + padding) - Math.max(a.left, b.left - padding));
  const overlapHeight = Math.max(0, Math.min(a.bottom, b.bottom + padding) - Math.max(a.top, b.top - padding));
  return overlapWidth * overlapHeight;
}
