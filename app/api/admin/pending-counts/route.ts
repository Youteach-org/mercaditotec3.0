import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firestoreRest";
import { ApiAuthError, requireAdmin } from "@/lib/store/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const db = getAdminDb();
    const [users, stores] = await Promise.all([
      db.collection("users").where("studentStatus", "==", "pending").count().get(),
      db.collection("stores").where("status", "==", "pending_review").count().get(),
    ]);
    return NextResponse.json(
      {
        usersPending: users.data().count,
        storesPending: stores.data().count,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("ADMIN_PENDING_COUNTERS_UNAVAILABLE", error instanceof Error ? error.name : "Unknown");
    return NextResponse.json(
      { error: "No se pudieron consultar las aprobaciones pendientes." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
