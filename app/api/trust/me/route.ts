import { NextResponse } from "next/server";

import { getStudentTrust, TrustRepositoryError } from "@/lib/security/trustRepository";
import { ApiAuthError, requireFirebaseUser } from "@/lib/store/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireFirebaseUser(request);
    const trust = await getStudentTrust(user.uid);
    return NextResponse.json({ trust });
  } catch (error) {
    if (error instanceof ApiAuthError || error instanceof TrustRepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Unexpected trust status error:", error);
    return NextResponse.json({ error: "No se pudo consultar el estado de alumno." }, { status: 500 });
  }
}
