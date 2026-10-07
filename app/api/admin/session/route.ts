import { NextResponse } from "next/server";

import { effectiveAdminRole } from "@/lib/security/domain";
import { ApiAuthError, requireAdmin } from "@/lib/store/auth";

export const runtime = "nodejs";

// Used only to unlock privileged UI. Every admin API still validates
// the Firebase token and current Firestore role independently.
export async function GET(request: Request) {
  try {
    const actor = await requireAdmin(request);
    const role = effectiveAdminRole(actor.profile);
    if (!role) {
      return NextResponse.json(
        { error: "No tienes permisos de administrador." },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { role },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("ADMIN_SESSION_CHECK_FAILED", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json(
      { error: "No se pudieron verificar los permisos administrativos." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
