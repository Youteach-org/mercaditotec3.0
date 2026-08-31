import { NextResponse } from "next/server";

import {
  AdminUserError,
  parseAdminRoleChange,
  setUserRoleBySuperadmin,
} from "@/lib/security/adminUsers";
import { ApiAuthError, requireSuperadmin } from "@/lib/store/auth";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ uid: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await requireSuperadmin(request);
    const { uid } = await context.params;
    const body = await request.json().catch(() => ({}));
    const role = parseAdminRoleChange(body);
    const user = await setUserRoleBySuperadmin(actor.uid, uid, role);
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof ApiAuthError || error instanceof AdminUserError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Unexpected admin role error:", error);
    return NextResponse.json({ error: "No se pudo actualizar el administrador." }, { status: 500 });
  }
}
