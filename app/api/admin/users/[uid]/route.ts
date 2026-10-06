import { NextResponse } from "next/server";

import {
  AdminUserError,
  deleteUserBySuperadmin,
} from "@/lib/security/adminUsers";
import {
  ApiAuthError,
  requireSuperadmin,
} from "@/lib/store/auth";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ uid: string }>;
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const actor = await requireSuperadmin(request);
    const { uid } = await context.params;
    const deleted = await deleteUserBySuperadmin(actor.uid, uid);
    return NextResponse.json({ deleted });
  } catch (error) {
    if (error instanceof ApiAuthError || error instanceof AdminUserError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Unexpected admin user deletion error:", error);
    return NextResponse.json(
      { error: "No se pudo eliminar al usuario." },
      { status: 500 },
    );
  }
}
