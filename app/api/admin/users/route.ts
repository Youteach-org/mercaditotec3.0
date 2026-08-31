import { NextResponse } from "next/server";

import { listUsersForAdmin, AdminUserError } from "@/lib/security/adminUsers";
import { ApiAuthError, requireAdmin } from "@/lib/store/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return NextResponse.json({ users: await listUsersForAdmin() });
  } catch (error) {
    if (error instanceof ApiAuthError || error instanceof AdminUserError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Unexpected admin users error:", error);
    return NextResponse.json({ error: "No se pudieron cargar los usuarios." }, { status: 500 });
  }
}
