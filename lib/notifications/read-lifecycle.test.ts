import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (relative: string) => readFileSync(new URL(relative, import.meta.url), "utf8");

describe("read alerts disappear and are not shown repeatedly", () => {
  it("serves only unread notifications and retains event deduplication", () => {
    const repository = source("./repository.ts");
    const route = source("../../app/api/notifications/route.ts");
    expect(repository).toContain("export async function listUnreadNotificationsForUser(");
    expect(repository).toContain('.where("readAt", "==", null)');
    expect(repository).toContain("const deduped = new Map<string, NotificationRecord>();");
    expect(route).toContain("listUnreadNotificationsForUser");
    expect(route).not.toContain("listNotificationsForUser(");
  });

  it("clears notices on visiting linked sections, but only with the current user's credentials", () => {
    const shell = source("../../components/AppShell.tsx");
    const endpoint = source("../../app/api/notifications/acknowledge-destination/route.ts");
    const repository = source("./repository.ts");
    expect(shell).toContain("shouldAcknowledgeDestination(pathname)");
    expect(shell).toContain("acknowledgeNotificationsAtDestination(firebaseUser, pathname)");
    expect(endpoint).toContain("await requireFirebaseUser(request)");
    expect(endpoint).toContain("acknowledgeNotificationsAtDestination(actor.uid, pathname)");
    expect(repository).toContain('.where("recipientUid", "==", recipientUid)');
    expect(repository).toContain("await batch.commit()");
    expect(repository).toContain("await syncUnreadNotificationCount(recipientUid)");
  });

  it("removes read notifications from the list instantly and clears pushed copies", () => {
    const page = source("../../app/notifications/page.tsx");
    const browser = source("./client.ts");
    const worker = source("../../public/firebase-messaging-sw.js");
    const foreground = source("./pushClient.ts");
    expect(page).toContain("setNotifications((current) => current.filter((item) => item.id !== notification.id))");
    expect(page).toContain("setNotifications([])");
    expect(page).toContain("dismissDeviceNotificationAlerts");
    expect(browser).toContain("registration.getNotifications()");
    expect(browser).toContain("notification.close()");
    expect(worker).toContain("notificationId: data.notificationId");
    expect(foreground).toContain("notificationId: data.notificationId");
  });
});
