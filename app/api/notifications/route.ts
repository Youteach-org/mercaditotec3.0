import { NextResponse } from "next/server";

import { serializeNotification, toNotificationApiError } from "@/lib/notifications/http";
import {
  listNotificationsForUser,
  syncUnreadNotificationCount,
} from "@/lib/notifications/repository";
import { requireFirebaseUser } from "@/lib/store/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireFirebaseUser(request);
    const { searchParams } = new URL(request.url);

    if (searchParams.get("summary") === "1") {
      const unreadCount = await syncUnreadNotificationCount(user.uid);
      return NextResponse.json({ unreadCount });
    }

    const notifications = await listNotificationsForUser(user.uid);
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
