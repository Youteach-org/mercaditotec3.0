import { NextResponse } from "next/server";

import {
  getPublicStoreDetail,
  PublicMarketplaceError,
} from "@/lib/store/publicMarketplaceRepository";

export const runtime = "nodejs";

const PUBLIC_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30",
};

export async function GET(
  _request: Request,
  context: RouteContext<"/api/marketplace/stores/[slug]">,
) {
  try {
    const { slug } = await context.params;
    const store = await getPublicStoreDetail(slug);
    return NextResponse.json({ store }, { headers: PUBLIC_CACHE_HEADERS });
  } catch (error) {
    if (error instanceof PublicMarketplaceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: "No se pudo cargar la tienda." },
      { status: 500 },
    );
  }
}
