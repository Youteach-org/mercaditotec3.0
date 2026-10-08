import { NextResponse } from "next/server";
import { ApiAuthError, requireFirebaseUser } from "@/lib/store/auth";

import {
  getPublicStoreDetail,
  PublicMarketplaceError,
} from "@/lib/store/publicMarketplaceRepository";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: RouteContext<"/api/marketplace/stores/[slug]">,
) {
  try {
    await requireFirebaseUser(request);
    const { slug } = await context.params;
    const store = await getPublicStoreDetail(slug);
    return NextResponse.json({ store }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
    }
    if (error instanceof PublicMarketplaceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: "No se pudo cargar la tienda." },
      { status: 500 },
    );
  }
}
