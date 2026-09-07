import { NextResponse } from "next/server";

import { serializeNotification, toNotificationApiError } from "@/lib/notifications/http";
import { markNotificationRead } from "@/lib/notifications/repository";
import { requireFirebaseUser } from "@/lib/store/auth";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/notifications/[notificationId]/read">,
) {
  try {
    const user = await requireFirebaseUser(request);
    const { notificationId } = await context.params;
    const notification = await markNotificationRead(user.uid, notificationId);
    return NextResponse.json({ notification: serializeNotification(notification) });
  } catch (error) {
    const apiError = toNotificationApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}
