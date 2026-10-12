import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firestoreRest";
import { ApiAuthError, requireAdmin } from "@/lib/store/auth";
import { isSuperadminRole } from "@/lib/security/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = await requireAdmin(request);
    const db = getAdminDb();
    const usersPendingPromise = isSuperadminRole(actor.profile)
      ? db.collection("users").where("studentStatus", "==", "pending").count().get()
      : Promise.resolve(null);
    const [users, stores] = await Promise.all([
      usersPendingPromise,
      db.collection("stores").where("status", "==", "pending_review").count().get(),
    ]);
    return NextResponse.json(
      {
        usersPending: users?.data().count ?? 0,
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
