import { NextResponse } from "next/server";
import { loadSiteAnalytics } from "@/lib/monitoring/siteAnalytics";
import { ApiAuthError, requireAdmin } from "@/lib/store/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    // Statistics must remain private to authorized MercaditoTec administrators.
    await requireAdmin(request);
    const query = new URL(request.url).searchParams;
    const days: 7 | 30 = query.get("days") === "30" ? 30 : 7;
    const snapshot = await loadSiteAnalytics(days);
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("SITE_ANALYTICS_UNAVAILABLE", error instanceof Error ? error.name : "Unknown");
    return NextResponse.json({ error: "No se pudieron consultar las estadísticas." }, { status: 503 });
  }
}
