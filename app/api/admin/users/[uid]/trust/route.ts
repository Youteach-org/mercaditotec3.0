import { NextResponse } from "next/server";

import {
  AdminUserError,
  parseAdminTrustChange,
  setStudentTrustByAdmin,
} from "@/lib/security/adminUsers";
import {
  ApiAuthError,
  getAuthenticatedAdminRole,
  requireAdmin,
} from "@/lib/store/auth";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ uid: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await requireAdmin(request);
    const actorRole = await getAuthenticatedAdminRole(actor);
    if (!actorRole) {
      throw new ApiAuthError(403, "No tienes permisos de administrador.");
    }

    const { uid } = await context.params;
    const body = await request.json().catch(() => ({}));
    const status = parseAdminTrustChange(body);
    const user = await setStudentTrustByAdmin(actor.uid, actorRole, uid, status);
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof ApiAuthError || error instanceof AdminUserError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Unexpected admin trust error:", error);
    return NextResponse.json({ error: "No se pudo actualizar la confianza del usuario." }, { status: 500 });
  }
}
