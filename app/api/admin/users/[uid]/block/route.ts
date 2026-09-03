import { NextResponse } from "next/server";

import { parseResolutionInput } from "@/lib/moderation/domain";
import { moderationApiError } from "@/lib/moderation/http";
import { getReportForAdmin, resolveReport } from "@/lib/moderation/repository";
import {
  ApiAuthError,
  getAuthenticatedAdminRole,
  requireAdmin,
} from "@/lib/store/auth";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: RouteContext<"/api/admin/users/[uid]/block">,
) {
  try {
    const actor = await requireAdmin(request);
    const role = await getAuthenticatedAdminRole(actor);
    if (!role) throw new ApiAuthError(403, "No tienes permisos de administrador.");
    const body = await request.json();
    const input = parseResolutionInput(body);
    if (input.action !== "user_block" && input.action !== "user_unblock") {
      return NextResponse.json({ error: "La acción de bloqueo no es válida." }, { status: 400 });
    }
    const reportId = String(body?.reportId ?? "");
    const { uid } = await context.params;
    const report = await getReportForAdmin(reportId);
    const targetUid = report.targetType === "message"
      ? report.targetSnapshot.authorUid
      : report.targetId;
    if (!targetUid || targetUid !== uid) {
      return NextResponse.json({ error: "El reporte no corresponde a este usuario." }, { status: 409 });
    }
    const resolved = await resolveReport({ uid: actor.uid, role }, reportId, input);
    return NextResponse.json({ report: resolved });
  } catch (error) {
    const apiError = moderationApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}
