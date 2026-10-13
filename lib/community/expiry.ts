import type { CommunityPostApiRecord } from "./http";

export const QUICK_NOTICE_LIFETIME_MS = 48 * 60 * 60 * 1000;

/** Browser-only expiry check; no API calls or extra Firestore reads. */
export function isCommunityPostVisible(
  post: Pick<CommunityPostApiRecord, "type" | "status" | "createdAt">,
  nowMs: number = Date.now(),
): boolean {
  if (post.status !== "active") return false;
  // Found objects must not expire until their owner resolves the report.
  if (post.type === "found_item") return true;
  if (post.type !== "quick_notice") return false;
  const createdAt = Date.parse(post.createdAt);
  return Number.isFinite(createdAt) &&
    createdAt <= nowMs &&
    nowMs - createdAt < QUICK_NOTICE_LIFETIME_MS;
}
