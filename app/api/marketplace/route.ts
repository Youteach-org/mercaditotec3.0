import { NextResponse } from "next/server";

import { FirestoreRestError } from "@/lib/firestoreRest";
import { getPublicMarketplaceSnapshot } from "@/lib/store/publicMarketplaceSnapshot";

export const runtime = "nodejs";

const PUBLIC_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=120",
  "CDN-Cache-Control": "public, max-age=60, stale-while-revalidate=120",
};

export async function GET() {
  try {
    const data = await getPublicMarketplaceSnapshot();
    return NextResponse.json(data, { headers: PUBLIC_CACHE_HEADERS });
  } catch (error) {
    if (error instanceof FirestoreRestError && error.status === 429) {
      console.error("PUBLIC_MARKETPLACE_RUNTIME_THROTTLED", 429);
      return NextResponse.json(
        { error: "El Mercadito está temporalmente saturado. Vuelve a intentarlo en un momento.", retryable: true },
        { status: 503, headers: { "Retry-After": "60", "Cache-Control": "no-store" } },
      );
    }
    console.error("PUBLIC_MARKETPLACE_RUNTIME_ERROR", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json(
      { error: "No se pudo cargar el Mercadito." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
