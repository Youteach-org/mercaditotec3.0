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
    // Registration creates a pending profile before email verification.
    // Count only eligible registrations; in-person activations follow the
    // existing admin-verified identity exception. Aggregate queries avoid
    // fetching entire user documents on each admin visit.
    const usersPendingPromise = isSuperadminRole(actor.profile)
      ? Promise.all([
          db.collection("users")
            .where("studentStatus", "==", "pending")
            .where("emailVerified", "==", true)
            .count().get(),
          db.collection("users")
            .where("studentStatus", "==", "pending")
            .where("registrationSource", "==", "manual_admin")
            .where("manualActivationStatus", "==", "activated")
            .where("emailVerified", "==", false)
            .count().get(),
        ])
      : Promise.resolve(null);
    const [users, stores] = await Promise.all([
      usersPendingPromise,
      db.collection("stores").where("status", "==", "pending_review").count().get(),
    ]);
    return NextResponse.json(
      {
        usersPending: users ? users[0].data().count + users[1].data().count : 0,
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
