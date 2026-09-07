import { NextResponse } from "next/server";

import {
  getPublicStoreDetail,
  PublicMarketplaceError,
} from "@/lib/store/publicMarketplaceRepository";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/marketplace/stores/[slug]">,
) {
  try {
    const { slug } = await context.params;
    const store = await getPublicStoreDetail(slug);
    return NextResponse.json({ store });
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
