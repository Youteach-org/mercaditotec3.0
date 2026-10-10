import { NextResponse } from "next/server";
import { AdminUserError } from "@/lib/security/adminUsers";
import { createManualUser, parseManualRegistration } from "@/lib/security/manualUserActivation";
import { ApiAuthError, requireSuperadmin } from "@/lib/store/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const actor = await requireSuperadmin(request);
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 2048)
      throw new AdminUserError(413, "Datos demasiado extensos.");
    let body: unknown;
    try { body = JSON.parse(raw); }
    catch { throw new AdminUserError(400, "Datos de alta inválidos."); }
    return NextResponse.json(
      await createManualUser(actor.uid, parseManualRegistration(body)),
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof AdminUserError || error instanceof ApiAuthError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("MANUAL_USER_CREATE_ERROR", error);
    return NextResponse.json({ error: "No se pudo registrar al usuario." }, { status: 500 });
  }
}
