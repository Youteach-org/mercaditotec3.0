import { NextResponse } from "next/server";
import { requireFirebaseUser, ApiAuthError } from "@/lib/store/auth";
import { getPublicMarketplaceSnapshot } from "@/lib/store/publicMarketplaceSnapshot";
import { mergeDiscoverListings } from "@/lib/descubre/feed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Data is a shared materialized snapshot, but the endpoint itself is private:
// never put identity-gated product data into a shared CDN response cache.
export async function GET(request: Request) {
  try {
    await requireFirebaseUser(request);
    const snapshot = await getPublicMarketplaceSnapshot();
    return NextResponse.json(
      {
        products: mergeDiscoverListings(
          Array.isArray(snapshot.discoverProducts) ? snapshot.discoverProducts : [],
          Array.isArray(snapshot.discoverListings) ? snapshot.discoverListings : [],
        ),
        categories: snapshot.categories,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json(
      { error: "No se pudieron cargar los productos. Intenta de nuevo." },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } },
    );
  }
}
