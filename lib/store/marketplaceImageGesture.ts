/**
 * A mobile browser may emit two separate click events with detail=1.
 * Recognize repeated taps on the same store while the single-tap zoom is pending.
 */
export function shouldOpenStoreFromImageInteraction(
  clickDetail: number,
  pendingStoreHref: string | null,
  currentStoreHref: string,
): boolean {
  return clickDetail >= 2 ||
    (pendingStoreHref !== null && pendingStoreHref === currentStoreHref);
}
