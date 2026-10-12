import { NextResponse } from "next/server";

import { serializeNotification, toNotificationApiError } from "@/lib/notifications/http";
import {
  listNotificationsForUser,
  syncUnreadNotificationCount,
} from "@/lib/notifications/repository";
import { requireFirebaseUser } from "@/lib/store/auth";
import { isAdminRole, isSuperadminRole } from "@/lib/security/domain";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireFirebaseUser(request);
    const { searchParams } = new URL(request.url);

    const hideStudentApprovals = !isSuperadminRole(user.profile);
    if (searchParams.get("summary") === "1" && isAdminRole(user.profile) && hideStudentApprovals) {
      const notifications = await listNotificationsForUser(user.uid);
      return NextResponse.json({
        unreadCount: notifications.filter((notice) => notice.type !== "student_pending" && !notice.readAt).length,
      }, { headers: { "Cache-Control": "private, no-store" } });
    }

    if (searchParams.get("summary") === "1") {
      const saved = user.profile?.unreadNotificationCount;
      const unreadCount =
        typeof saved === "number" && Number.isFinite(saved) && saved >= 0
          ? Math.floor(saved)
          : await syncUnreadNotificationCount(user.uid);
      return NextResponse.json({ unreadCount }, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }

    const allNotifications = await listNotificationsForUser(user.uid);
    const notifications = hideStudentApprovals
      ? allNotifications.filter((notification) => notification.type !== "student_pending")
      : allNotifications;
    const unreadCount = notifications.filter((notification) => !notification.readAt).length;
    return NextResponse.json({
      notifications: notifications.map(serializeNotification),
      unreadCount,
    });
  } catch (error) {
    const apiError = toNotificationApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}
