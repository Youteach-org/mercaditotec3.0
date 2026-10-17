import { NextResponse } from "next/server";
import { requireSuperadmin, ApiAuthError } from "@/lib/store/auth";
import { listManualReviewListings, decideManualReview, ListingError } from "@/lib/descubre/listings";
import { writeAuditEntry } from "@/lib/security/audit";
import { createNotificationSafely } from "@/lib/notifications/repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireSuperadmin(request);
    const listings = await listManualReviewListings();
    return NextResponse.json({ listings }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof ApiAuthError || error instanceof ListingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "No se pudo consultar la cola de revisión." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireSuperadmin(request);
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const id = typeof body.id === "string" ? body.id : "";
    const decision = body.decision;
    if (decision !== "approved" && decision !== "blocked") {
      return NextResponse.json({ error: "Decisión inválida." }, { status: 400 });
    }
    const reason = typeof body.reason === "string" ? body.reason : "";
    const listing = await decideManualReview(id, decision, actor.uid, reason);
    try {
      await writeAuditEntry({
        actorUid: actor.uid,
        actorRole: "superadmin",
        action: decision === "approved" ? "discover_manual_approve" : "discover_manual_reject",
        targetType: "listing",
        targetId: listing.id,
        metadata: { sellerUid: listing.ownerUid, source: "ai_quota_exhausted" },
      });
    } catch (error) {
      console.warn("DISCOVER_MANUAL_AUDIT_UNAVAILABLE", error instanceof Error ? error.name : "Unknown");
    }
    await createNotificationSafely({
      recipientUid: listing.ownerUid,
      type: decision === "approved" ? "discover_manual_approved" : "discover_manual_rejected",
      title: decision === "approved" ? "Tu anuncio fue aprobado" : "Tu anuncio fue rechazado",
      message: decision === "approved" ? "Tu anuncio ya está publicado en Descubre." : "Tu anuncio no fue aprobado. Revisa el motivo en tus anuncios.",
      href: "/descubre/anuncios/" + encodeURIComponent(listing.id),
      dedupeKey: "discover:manual-decision:" + listing.id,
    });
    return NextResponse.json({ listing: { id: listing.id, status: listing.status } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiAuthError || error instanceof ListingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "No se pudo completar la revisión." }, { status: 503 });
  }
}
