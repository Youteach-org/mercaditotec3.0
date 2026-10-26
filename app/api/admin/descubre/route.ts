import { NextResponse } from "next/server";
import { requireSuperadmin, ApiAuthError } from "@/lib/store/auth";
import { listManualReviewListings, decideManualReview, ListingError } from "@/lib/descubre/listings";
import { writeAuditEntry } from "@/lib/security/audit";
import { createNotificationSafely } from "@/lib/notifications/repository";
import { listManualReviewStoreProducts, decideManualStoreProduct, ProductRepositoryError } from "@/lib/store/productRepository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireSuperadmin(request);
    const [listings, storeProducts] = await Promise.all([listManualReviewListings(), listManualReviewStoreProducts()]);
    return NextResponse.json({ listings: [
      ...listings.map((listing) => ({ ...listing, kind: "independent" })),
      ...storeProducts,
    ] }, { headers: { "Cache-Control": "private, no-store" } });
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
    if (body.kind === "store-product") {
      const version = body.contentVersion;
      if (!Number.isSafeInteger(version) || Number(version) < 1 ||
        !/^[A-Za-z0-9_-]{1,160}$/.test(id) || (decision === "blocked" && !reason.trim())) {
        return NextResponse.json({ error: "Datos de revisión inválidos." }, { status: 400 });
      }
      const product = await decideManualStoreProduct(id, Number(version), decision, reason);
      await createNotificationSafely({
        recipientUid: product.ownerUid,
        type: decision === "approved" ? "store_product_review_approved" : "store_product_review_rejected",
        title: decision === "approved" ? "Producto aprobado" : "Producto rechazado",
        message: decision === "approved" ? "Tu producto ya está publicado." : "Revisa el motivo del rechazo en Mis tiendas.",
        href: `/mystore/${product.storeId}`, dedupeKey: `store-product:manual-decision:${id}:${version}`,
      });
      await writeAuditEntry({ actorUid: actor.uid, actorRole: "superadmin",
        action: decision === "approved" ? "discover_manual_approve" : "discover_manual_reject",
        targetType: "listing", targetId: id, metadata: { sellerUid: product.ownerUid, source: "store_product_review" } }).catch(() => {});
      return NextResponse.json({ product: { id, status: decision } });
    }
    const listing = await decideManualReview(id, decision, actor.uid, reason);
    try {
      await writeAuditEntry({
        actorUid: actor.uid,
        actorRole: "superadmin",
        action: decision === "approved" ? "discover_manual_approve" : "discover_manual_reject",
        targetType: "listing",
        targetId: listing.id,
        metadata: { sellerUid: listing.ownerUid, source: "automatic_review_unavailable" },
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
    if (error instanceof ApiAuthError || error instanceof ListingError || error instanceof ProductRepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "No se pudo completar la revisión." }, { status: 503 });
  }
}
