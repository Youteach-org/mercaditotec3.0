import { NextResponse } from "next/server";

import { endorseStudent, TrustRepositoryError } from "@/lib/security/trustRepository";
import { ApiAuthError, requireFirebaseUser } from "@/lib/store/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireFirebaseUser(request);
    const body = await request.json().catch(() => ({}));
    const email =
      body && typeof body === "object" && typeof (body as Record<string, unknown>).email === "string"
        ? String((body as Record<string, unknown>).email)
        : "";

    const trust = await endorseStudent(user.uid, email);
    return NextResponse.json({ ok: true, trust });
  } catch (error) {
    if (error instanceof ApiAuthError || error instanceof TrustRepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Unexpected endorsement error:", error);
    return NextResponse.json({ error: "No se pudo registrar el aval." }, { status: 500 });
  }
}
