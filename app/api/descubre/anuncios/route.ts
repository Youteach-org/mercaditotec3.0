import { NextResponse } from "next/server";
import { ApiAuthError, requireUnblockedUser } from "@/lib/store/auth";
import { createListingForScreening, listOwnListings, ListingError } from "@/lib/descubre/listings";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireUnblockedUser(request);
    return NextResponse.json({ listings: await listOwnListings(user.uid) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof ApiAuthError || error instanceof ListingError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "No se pudieron consultar tus anuncios." }, { status: 503 });
  }
}

// This route ONLY creates a private, unapproved draft. The Cloudflare runtime
// intercepts it, scans actual image bytes and text, and calls the internal
// finalization route. There is no alternate endpoint that self-approves.
export async function POST(request: Request) {
  try {
    const user = await requireUnblockedUser(request);
    const raw = await request.text();
    if (raw.length > 5000) return NextResponse.json({ error: "El anuncio es demasiado grande." }, { status: 413 });
    const input = JSON.parse(raw);
    const listing = await createListingForScreening(user.uid, user.profile, input);
    return NextResponse.json({ id: listing.id, status: "screening" }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiAuthError || error instanceof ListingError) return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "El anuncio no contiene datos válidos." }, { status: 400 });
    console.error("DISCOVER_CREATE_ERROR", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "No se pudo guardar el anuncio." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
