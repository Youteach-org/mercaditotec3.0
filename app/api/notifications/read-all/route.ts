import { NextResponse } from "next/server";

import { toNotificationApiError } from "@/lib/notifications/http";
import { markAllNotificationsRead } from "@/lib/notifications/repository";
import { requireFirebaseUser } from "@/lib/store/auth";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    const user = await requireFirebaseUser(request);
    const updatedCount = await markAllNotificationsRead(user.uid);
    return NextResponse.json({ updatedCount });
  } catch (error) {
    const apiError = toNotificationApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}
