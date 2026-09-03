import { NextResponse } from "next/server";

import { parseResolutionInput } from "@/lib/moderation/domain";
import { moderationApiError } from "@/lib/moderation/http";
import { resolveReport } from "@/lib/moderation/repository";
import {
  ApiAuthError,
  getAuthenticatedAdminRole,
  requireAdmin,
} from "@/lib/store/auth";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: RouteContext<"/api/admin/reports/[reportId]/resolve">,
) {
  try {
    const actor = await requireAdmin(request);
    const role = await getAuthenticatedAdminRole(actor);
    if (!role) throw new ApiAuthError(403, "No tienes permisos de administrador.");
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "La solicitud no contiene datos válidos." },
        { status: 400 },
      );
    }
    const { reportId } = await context.params;
    const report = await resolveReport(
      { uid: actor.uid, role },
      reportId,
      parseResolutionInput(body),
    );
    return NextResponse.json({ report });
  } catch (error) {
    const apiError = moderationApiError(error);
    const currentState = error && typeof error === "object" && "currentState" in error
      ? (error as { currentState?: unknown }).currentState
      : undefined;
    return NextResponse.json(
      { error: apiError.message, report: currentState },
      { status: apiError.status },
    );
  }
}
