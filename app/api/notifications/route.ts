import { NextResponse } from "next/server";

import { serializeNotification, toNotificationApiError } from "@/lib/notifications/http";
import { listNotificationsForUser } from "@/lib/notifications/repository";
import { requireFirebaseUser } from "@/lib/store/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireFirebaseUser(request);
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
