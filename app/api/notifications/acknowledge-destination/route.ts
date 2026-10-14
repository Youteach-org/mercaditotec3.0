import { NextResponse } from "next/server";

import { acknowledgeNotificationsAtDestination } from "@/lib/notifications/repository";
import { shouldAcknowledgeDestination } from "@/lib/notifications/destination";
import { toNotificationApiError } from "@/lib/notifications/http";
import { requireFirebaseUser } from "@/lib/store/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const actor = await requireFirebaseUser(request);
    const body = await request.json().catch(() => ({}));
    const pathname = typeof body?.pathname === "string" ? body.pathname : "";
    if (pathname.length > 220 || !shouldAcknowledgeDestination(pathname)) {
      return NextResponse.json({ error: "Destino de notificación inválido." }, { status: 400 });
    }
    const result = await acknowledgeNotificationsAtDestination(actor.uid, pathname);
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const apiError = toNotificationApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}
