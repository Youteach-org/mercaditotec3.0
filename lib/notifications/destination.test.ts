import { describe, expect, it } from "vitest";
import {
  notificationMatchesDestination,
  shouldAcknowledgeDestination,
  type NotificationDestination,
} from "./destination";

const notice = (type: NotificationDestination["type"], href: string): NotificationDestination => ({ type, href });

describe("automatic notification acknowledgement by actual destination", () => {
  it("recognizes only destinations that can be marked read", () => {
    for (const path of [
      "/orders", "/mystore/orders", "/mystore/store-1",
      "/chat/personal/seller-1", "/admin/stores", "/admin/stores/shop-1",
      "/admin/users",
    ]) expect(shouldAcknowledgeDestination(path)).toBe(true);
    for (const path of ["/", "/marketplace", "/notifications", "/chat/personal", "/profile", "//outside.com/orders"]) {
      expect(shouldAcknowledgeDestination(path)).toBe(false);
    }
  });

  it("acknowledges only the relevant order side when its orders page is visited", () => {
    expect(notificationMatchesDestination(notice("order_accepted", "/orders"), "/orders")).toBe(true);
    expect(notificationMatchesDestination(notice("order_created", "/mystore/orders"), "/orders")).toBe(false);
    expect(notificationMatchesDestination(notice("order_created", "/mystore/orders"), "/mystore/orders")).toBe(true);
    expect(notificationMatchesDestination(notice("order_accepted", "/orders"), "/notifications")).toBe(false);
  });

  it("does not clear private message alerts until their precise conversation is opened", () => {
    const senderA = notice("direct_message", "/chat/personal/user-a");
    const senderB = notice("direct_message", "/chat/personal/user-b");
    expect(notificationMatchesDestination(senderA, "/chat/personal")).toBe(false);
    expect(notificationMatchesDestination(senderA, "/chat/personal/user-a")).toBe(true);
    expect(notificationMatchesDestination(senderB, "/chat/personal/user-a")).toBe(false);
  });

  it("acknowledges store and student moderation notices from their actual areas", () => {
    expect(notificationMatchesDestination(notice("store_pending_review", "/admin/stores/shop-a"), "/admin/stores")).toBe(true);
    expect(notificationMatchesDestination(notice("store_pending_review", "/admin/stores/shop-a"), "/admin/stores/shop-b")).toBe(false);
    expect(notificationMatchesDestination(notice("store_pending_review", "/admin/stores/shop-a"), "/admin/stores/shop-a")).toBe(true);
    expect(notificationMatchesDestination(notice("student_pending", "/admin/users?status=pending"), "/admin/users")).toBe(true);
    expect(notificationMatchesDestination(notice("student_pending", "/admin/users"), "/admin/stores")).toBe(false);
    expect(notificationMatchesDestination(notice("store_pending_review", "/mystore/shop-a"), "/mystore/shop-a")).toBe(true);
    expect(notificationMatchesDestination(notice("store_approved", "/mystore/shop-a"), "/mystore/shop-b")).toBe(false);
    expect(notificationMatchesDestination(notice("contact_attempt", "/mystore/shop-a"), "/mystore/shop-a")).toBe(true);
  });

  it("never acknowledges unrelated or maliciously supplied paths", () => {
    expect(notificationMatchesDestination(notice("direct_message", "/chat/personal/user-a"), "//evil.com/chat/personal/user-a")).toBe(false);
    expect(notificationMatchesDestination(notice("order_created", "/mystore/orders"), "/marketplace")).toBe(false);
    expect(notificationMatchesDestination(notice("contact_attempt", "/mystore/store-1"), "/mystore/orders")).toBe(false);
  });
});
