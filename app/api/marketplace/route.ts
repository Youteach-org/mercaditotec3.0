import { NextResponse } from "next/server";

import { listPublicStores } from "@/lib/store/publicMarketplaceRepository";

export const runtime = "nodejs";

const PUBLIC_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

export async function GET() {
  try {
    const stores = await listPublicStores();
    return NextResponse.json({ stores }, { headers: PUBLIC_CACHE_HEADERS });
  } catch {
    return NextResponse.json(
      { error: "No se pudo cargar el Mercadito." },
      { status: 500 },
    );
  }
}
