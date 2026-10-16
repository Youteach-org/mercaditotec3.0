import { NextResponse } from "next/server";
import { getPublicMarketplaceSnapshot } from "@/lib/store/publicMarketplaceSnapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Data contains only storefront items already published publicly before
// Descubre was introduced, or future individually screened items. The
// materialized catalog is shared; no per-card or per-user Firestore reads.
const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=120",
  "CDN-Cache-Control": "public, max-age=60, stale-while-revalidate=120",
};

export async function GET() {
  try {
    const snapshot = await getPublicMarketplaceSnapshot();
    return NextResponse.json(
      {
        products: Array.isArray(snapshot.discoverProducts) ? snapshot.discoverProducts : [],
        categories: snapshot.categories,
      },
      { headers: CACHE_HEADERS },
    );
  } catch {
    return NextResponse.json(
      { error: "No se pudieron cargar los productos. Intenta de nuevo." },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } },
    );
  }
}
