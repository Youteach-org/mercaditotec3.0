import { NextResponse } from "next/server";

import { FirestoreRestError } from "@/lib/firestoreRest";
import { ApiAuthError, requireFirebaseUser } from "@/lib/store/auth";
import { getPublicMarketplaceSnapshot } from "@/lib/store/publicMarketplaceSnapshot";

export const runtime = "nodejs";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  try {
    await requireFirebaseUser(request);
    const data = await getPublicMarketplaceSnapshot();
    const { discoverProducts: _privateProducts, discoverListings: _privateListings, ...publicStoreCatalogue } = data;
    void _privateProducts; void _privateListings;
    return NextResponse.json(publicStoreCatalogue, { headers: PRIVATE_HEADERS });
  } catch (error) {
    if (error instanceof ApiAuthError) return NextResponse.json({ error: error.message }, { status: error.status, headers: PRIVATE_HEADERS });
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
