import { NextResponse } from "next/server";

import { listAuditEntries } from "@/lib/security/audit";
import { ApiAuthError, requireAdmin } from "@/lib/store/auth";
import { isSuperadminRole } from "@/lib/security/domain";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const actor = await requireAdmin(request);
    const entries = await listAuditEntries(100);
    return NextResponse.json({ entries: isSuperadminRole(actor.profile)
      ? entries
      : entries.filter((entry) => entry.targetType !== "user" && !entry.action.startsWith("user.")),
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Unexpected audit log error:", error);
    return NextResponse.json({ error: "No se pudo cargar el historial." }, { status: 500 });
  }
}
