import { NextResponse } from "next/server";
import { ApiAuthError, requireUnblockedUser } from "@/lib/store/auth";
import { getListing, markListingSold, ListingError, isVisibleListing } from "@/lib/descubre/listings";
import { publisherWhatsappUrl } from "@/lib/descubre/contact";
import { getAdminDb } from "@/lib/firestoreRest";

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext<"/api/descubre/anuncios/[id]">) {
  try {
    const actor = await requireUnblockedUser(request);
    const { id } = await context.params;
    const listing = await getListing(id, actor.uid);
    let contactWhatsappUrl: string | null = null;
    // Read the current owner's number only for an authenticated visitor
    // viewing an approved, unexpired listing. No phone is stored in the
    // public marketplace snapshot or requested by the Descubre feed.
    if (listing.ownerUid !== actor.uid && isVisibleListing(listing)) {
      const ownerProfile = await getAdminDb().collection("users").doc(listing.ownerUid).get();
      if (ownerProfile.exists && ownerProfile.data()?.isActive !== false) {
        contactWhatsappUrl = publisherWhatsappUrl(ownerProfile.data());
      }
    }
    return NextResponse.json(
      { listing: { ...listing, contactWhatsappUrl } },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof ApiAuthError || error instanceof ListingError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Anuncio no disponible." }, { status: 503 });
  }
}

export async function PATCH(request: Request, context: RouteContext<"/api/descubre/anuncios/[id]">) {
  try {
    const actor = await requireUnblockedUser(request);
    const { id } = await context.params;
    const input = await request.json().catch(() => ({})) as Record<string, unknown>;
    if (input.status !== "sold") return NextResponse.json({ error: "Acción no permitida." }, { status: 400 });
    await markListingSold(actor.uid, id);
    return NextResponse.json({ status: "sold" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiAuthError || error instanceof ListingError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "No se pudo actualizar el anuncio." }, { status: 503 });
  }
}
