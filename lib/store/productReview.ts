import { DISCOVER_LEGACY_CUTOFF_MS } from "./discoverFeed";

export type StoreProductReviewStatus = "screening" | "approved" | "blocked" | "needs_changes" | "manual_review" | "hidden" | "legacy";

export function nextProductReview(visibility: "published" | "hidden", previousVersion = 0) {
  return {
    reviewStatus: visibility === "published" ? "screening" as const : "hidden" as const,
    reviewReason: null as string | null,
    contentVersion: previousVersion + 1,
    approvedVersion: null as number | null,
  };
}

export function isApprovedStoreProduct(product: {
  visibility: string;
  reviewStatus?: string | null;
  contentVersion?: number | null;
  approvedVersion?: number | null;
  createdAt?: number;
  updatedAt?: number;
}): boolean {
  if (product.visibility !== "published") return false;
  if (product.reviewStatus === "approved") {
    return typeof product.contentVersion === "number" && product.contentVersion === product.approvedVersion;
  }
  if (product.reviewStatus && product.reviewStatus !== "legacy") return false;
  return Boolean(product.createdAt && product.updatedAt &&
    product.createdAt < DISCOVER_LEGACY_CUTOFF_MS && product.updatedAt < DISCOVER_LEGACY_CUTOFF_MS);
}

export function needsLegacyProductReview(product: {
  visibility: string; reviewStatus?: string | null; createdAt?: number; updatedAt?: number;
}): boolean {
  return product.visibility === "published" &&
    (!product.reviewStatus || product.reviewStatus === "legacy") &&
    Boolean(product.createdAt && product.updatedAt &&
      (product.createdAt >= DISCOVER_LEGACY_CUTOFF_MS || product.updatedAt >= DISCOVER_LEGACY_CUTOFF_MS));
}
