import { NextResponse } from "next/server";

import { getMarketplaceContent } from "@/lib/store/marketplaceContentRepository";
import { listPublicStores } from "@/lib/store/publicMarketplaceRepository";

export const runtime = "nodejs";

const PUBLIC_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
};

export async function GET() {
  try {
    const [stores, content] = await Promise.all([
      listPublicStores(),
      getMarketplaceContent(),
    ]);
    return NextResponse.json({ stores, content }, { headers: PUBLIC_CACHE_HEADERS });
  } catch {
    return NextResponse.json(
      { error: "No se pudo cargar el Mercadito." },
      { status: 500 },
    );
  }
}
