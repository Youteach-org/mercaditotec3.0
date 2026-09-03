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
  context: RouteContext<"/api/admin/messages/[messageId]/visibility">,
) {
  try {
    const actor = await requireAdmin(request);
    const role = await getAuthenticatedAdminRole(actor);
    if (!role) throw new ApiAuthError(403, "No tienes permisos de administrador.");
    const body = await request.json();
    const input = parseResolutionInput(body);
    if (input.action !== "message_hide" && input.action !== "message_restore") {
      return NextResponse.json({ error: "La acción de visibilidad no es válida." }, { status: 400 });
    }
    const reportId = String(body?.reportId ?? "");
    const { messageId } = await context.params;
    const report = await getReportForAdmin(reportId);
    if (report.targetType !== "message" || report.targetId !== messageId) {
      return NextResponse.json({ error: "El reporte no corresponde a este mensaje." }, { status: 409 });
    }
    const resolved = await resolveReport({ uid: actor.uid, role }, reportId, input);
    return NextResponse.json({ report: resolved });
  } catch (error) {
    const apiError = moderationApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}
