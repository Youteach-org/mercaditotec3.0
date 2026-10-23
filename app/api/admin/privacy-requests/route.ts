import { NextResponse } from "next/server";
import { requireSuperadmin, ApiAuthError } from "@/lib/store/auth";
import { listAllArcoRequests } from "@/lib/privacy/repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireSuperadmin(request);
    return NextResponse.json({ requests: await listAllArcoRequests() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiAuthError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("ADMIN_ARCO_LIST_UNAVAILABLE", error instanceof Error ? error.name : "Unknown");
    return NextResponse.json({ error: "No se pudieron consultar las solicitudes." }, { status: 503 });
  }
}
