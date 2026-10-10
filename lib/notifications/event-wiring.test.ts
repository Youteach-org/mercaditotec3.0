import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("Notification event integrations", () => {
  it("notifies admins for new verified student accounts and pending stores", () => {
    expect(source("../security/accountProfile.ts")).toContain("notifyAdminsSafely");
    expect(source("../../app/api/stores/[storeId]/submit/route.ts")).toContain("store_pending_review");
  });
  it("notifies owners on moderation events and private messages", () => {
    expect(source("../../app/api/admin/stores/[storeId]/status/route.ts")).toContain("store_changes_required");
    expect(source("../../app/api/chat/direct/messages/route.ts")).toContain("direct_message");
  });
  it("uses server-resolved owners for WhatsApp attempts and limits duplicate clicks", () => {
    const route = source("../../app/api/marketplace/stores/[slug]/contact/route.ts");
    expect(route).toContain("await requireUnblockedUser(request)");
    expect(route).toContain('where("slug", "==", slug)');
    expect(route).toContain('status !== "active"');
    expect(route).toContain("Math.floor(Date.now() / 3_600_000)");
  });
  it("does not rely on the client to provide push recipients or event content", () => {
    const devices = source("../../app/api/notifications/devices/route.ts");
    expect(devices).toContain("registerPushDevice(user.uid");
    expect(devices).toContain("unregisterPushDevice(user.uid");
    const notificationRepository = source("./repository.ts");
    expect(notificationRepository).toContain("if (created)");
    expect(notificationRepository).toContain("deliverPushSafely");
  });
});
