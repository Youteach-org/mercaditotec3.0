import { NextResponse } from "next/server";

import {
  getPublicStoreDetail,
  PublicMarketplaceError,
} from "@/lib/store/publicMarketplaceRepository";
import {
  ApiAuthError,
  requireFirebaseUser,
} from "@/lib/store/auth";

export const runtime = "nodejs";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
};

export async function GET(
  request: Request,
  context: RouteContext<"/api/marketplace/stores/[slug]">,
) {
  try {
    await requireFirebaseUser(request);
    const { slug } = await context.params;
    const store = await getPublicStoreDetail(slug);
    return NextResponse.json({ store }, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error) {
    if (error instanceof ApiAuthError || error instanceof PublicMarketplaceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: "No se pudo cargar la tienda." },
      { status: 500 },
    );
  }
}
