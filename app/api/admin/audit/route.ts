import { NextResponse } from "next/server";

import { listAuditEntries } from "@/lib/security/audit";
import { ApiAuthError, requireAdmin } from "@/lib/store/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return NextResponse.json({ entries: await listAuditEntries(100) });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Unexpected audit log error:", error);
    return NextResponse.json({ error: "No se pudo cargar el historial." }, { status: 500 });
  }
}
