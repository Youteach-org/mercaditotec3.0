// Rotate the notices already loaded in the browser; never poll Firestore
// on every slide. A full cycle wraps back to the first visible notice.
export const QUICK_NOTICE_ROTATION_INTERVAL_MS = 7_000;

export function nextQuickNoticeIndex(
  currentIndex: number,
  count: number,
  direction: 1 | -1 = 1,
): number {
  if (count <= 1) return 0;
  return ((currentIndex + direction) % count + count) % count;
}
