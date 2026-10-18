import { NextResponse } from "next/server";
import { getPublicMarketplaceSnapshot } from "@/lib/store/publicMarketplaceSnapshot";
import { mergeDiscoverListings } from "@/lib/descubre/feed";
import { publicDiscoverPreview } from "@/lib/descubre/publicPreview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Public catalogue is deliberately limited to product cards. No owner IDs,
// seller profile data, WhatsApp numbers or store details are exposed here.
const PUBLIC_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=120",
  "CDN-Cache-Control": "public, max-age=60, stale-while-revalidate=120",
};

export async function GET() {
  try {
    const catalogue = await getPublicMarketplaceSnapshot();
    const products = mergeDiscoverListings(
      Array.isArray(catalogue.discoverProducts) ? catalogue.discoverProducts : [],
      Array.isArray(catalogue.discoverListings) ? catalogue.discoverListings : [],
    );
    return NextResponse.json({
      products: publicDiscoverPreview(products),
      categories: catalogue.categories,
      realStoreCount: catalogue.realStoreCount,
    }, { headers: PUBLIC_HEADERS });
  } catch {
    return NextResponse.json({ error: "No se pudo cargar Descubre." }, {
      status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" },
    });
  }
}
