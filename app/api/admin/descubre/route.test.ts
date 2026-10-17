import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  list: vi.fn(),
  decide: vi.fn(),
  audit: vi.fn(),
  notify: vi.fn(),
}));

vi.mock("@/lib/store/auth", () => ({
  requireSuperadmin: mocks.authorize,
  ApiAuthError: class ApiAuthError extends Error {
    constructor(public status: number, message: string) { super(message); }
  },
}));
vi.mock("@/lib/descubre/listings", () => ({
  listManualReviewListings: mocks.list,
  decideManualReview: mocks.decide,
  ListingError: class ListingError extends Error {
    constructor(public status: number, message: string) { super(message); }
  },
}));
vi.mock("@/lib/security/audit", () => ({ writeAuditEntry: mocks.audit }));
vi.mock("@/lib/notifications/repository", () => ({ createNotificationSafely: mocks.notify }));

import { GET, POST } from "./route";
import { ApiAuthError } from "@/lib/store/auth";

const request = (method: string, body?: unknown) =>
  new Request("https://mercaditotec.store/api/admin/descubre", {
    method,
    headers: { Authorization: "Bearer token" },
    ...(body ? { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } } : {}),
  });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.authorize.mockResolvedValue({ uid: "superadmin" });
  mocks.list.mockResolvedValue([{ id: "listing-123", status: "manual_review" }]);
  mocks.decide.mockResolvedValue({ id: "listing-123", ownerUid: "seller", status: "approved" });
  mocks.audit.mockResolvedValue(undefined);
  mocks.notify.mockResolvedValue(undefined);
});

describe("Admin Descubre manual review", () => {
  it("blocks unauthorized access before querying any pending products", async () => {
    mocks.authorize.mockRejectedValue(new ApiAuthError(403, "Prohibido"));
    const response = await GET(request("GET"));
    expect(response.status).toBe(403);
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it("lists private review queue only for superadmins", async () => {
    const response = await GET(request("GET"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect((await response.json()).listings).toHaveLength(1);
  });
  it("authorizes before approving, logs the decision and notifies seller", async () => {
    const response = await POST(request("POST", { id: "listing-123", decision: "approved" }));
    expect(response.status).toBe(200);
    expect(mocks.decide).toHaveBeenCalledWith("listing-123", "approved", "superadmin", "");
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({
      targetType: "listing", action: "discover_manual_approve",
    }));
    expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({
      recipientUid: "seller", type: "discover_manual_approved",
    }));
  });
  it("rejects unsupported decisions before changing a listing", async () => {
    const response = await POST(request("POST", { id: "listing-123", decision: "manual_review" }));
    expect(response.status).toBe(400);
    expect(mocks.decide).not.toHaveBeenCalled();
  });
});
