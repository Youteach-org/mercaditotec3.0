import { NextResponse } from "next/server";
import { AdminUserError } from "@/lib/security/adminUsers";
import { activateManually, parseActivationInput } from "@/lib/security/manualUserActivation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 1024)
      throw new AdminUserError(413, "Datos demasiado extensos.");
    let body: unknown;
    try { body = JSON.parse(raw); }
    catch { throw new AdminUserError(400, "Datos de activación inválidos."); }
    await activateManually(parseActivationInput(body));
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminUserError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("MANUAL_USER_ACTIVATE_ERROR", error);
    return NextResponse.json({ error: "No se pudo activar la cuenta." }, { status: 500 });
  }
}
