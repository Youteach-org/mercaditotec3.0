import { NextResponse } from "next/server";
import { loadOfficialUsage } from "@/lib/monitoring/usage";
import { ApiAuthError, requireAdmin } from "@/lib/store/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    // Never expose production usage data or server metrics credentials publicly.
    await requireAdmin(request);
    return NextResponse.json(await loadOfficialUsage(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("ADMIN_USAGE_UNAVAILABLE", error instanceof Error ? error.name : "Unknown");
    return NextResponse.json({ error: "No fue posible consultar las métricas." }, { status: 503 });
  }
}
