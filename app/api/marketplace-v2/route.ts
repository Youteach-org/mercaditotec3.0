import { NextResponse } from "next/server";
import { getPublicMarketplaceSnapshot } from "@/lib/store/publicMarketplaceSnapshot";
import { FirestoreRestError } from "@/lib/firestoreRest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// The public storefront is eventually consistent. A short shared response
// cache prevents repeat visitors from consuming Firestore's read quota.
const HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=120",
  "CDN-Cache-Control": "public, max-age=300, stale-while-revalidate=600",
};

export async function GET() {
  try {
    const data = await getPublicMarketplaceSnapshot();
    return NextResponse.json(
      { ...data, revision: "marketplace-demo-v2" },
      { headers: HEADERS },
    );
  } catch (error) {
    if (error instanceof FirestoreRestError && error.status === 429) {
      console.error("PUBLIC_MARKETPLACE_V2_DATA_THROTTLED", error.status);
      return NextResponse.json(
        { error: "El Mercadito está temporalmente saturado. Vuelve a intentarlo en un momento.", retryable: true },
        { status: 503, headers: { "Retry-After": "60", "Cache-Control": "no-store" } },
      );
    }
    console.error("Marketplace v2 load error:", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json(
      { error: "No se pudo cargar el Mercadito." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
