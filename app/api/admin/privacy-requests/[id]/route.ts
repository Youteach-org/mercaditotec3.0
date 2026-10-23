import { NextResponse } from "next/server";
import { requireSuperadmin, ApiAuthError } from "@/lib/store/auth";
import { parseArcoResolution, ArcoValidationError } from "@/lib/privacy/arco";
import { resolveArcoRequest } from "@/lib/privacy/repository";
import { PrivacyError } from "@/lib/privacy/auth";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/admin/privacy-requests/[id]">,
) {
  try {
    await requireSuperadmin(request);
    const { id } = await context.params;
    const raw = await request.text();
    if (raw.length > 2400)
      return NextResponse.json({ error: "Respuesta demasiado larga." }, { status: 413 });
    let body: unknown;
    try { body = JSON.parse(raw); }
    catch { return NextResponse.json({ error: "Respuesta inválida." }, { status: 400 }); }
    const { status, response } = parseArcoResolution(body);
    return NextResponse.json({ request: await resolveArcoRequest(id, status, response) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiAuthError || error instanceof PrivacyError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof ArcoValidationError)
      return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("ADMIN_ARCO_UPDATE_UNAVAILABLE", error instanceof Error ? error.name : "Unknown");
    return NextResponse.json({ error: "No se pudo responder la solicitud." }, { status: 503 });
  }
}
