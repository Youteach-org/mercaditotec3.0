import { NextResponse } from "next/server";

import { moderationApiError } from "@/lib/moderation/http";
import { getReportForAdmin } from "@/lib/moderation/repository";
import {
  ApiAuthError,
  getAuthenticatedAdminRole,
  requireAdmin,
} from "@/lib/store/auth";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: RouteContext<"/api/admin/reports/[reportId]">,
) {
  try {
    const actor = await requireAdmin(request);
    const role = await getAuthenticatedAdminRole(actor);
    if (!role) throw new ApiAuthError(403, "No tienes permisos de administrador.");
    const { reportId } = await context.params;
    const report = await getReportForAdmin(reportId, { uid: actor.uid, role });
    return NextResponse.json({ report });
  } catch (error) {
    const apiError = moderationApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}
