import { NextResponse } from "next/server";
import { rebuildPublicMarketplaceSnapshot } from "@/lib/store/publicMarketplaceSnapshot";

export const runtime = "nodejs";

// The Cloudflare runtime wrapper blocks all external requests to this endpoint.
// Do not expose this route through an authenticated client API.
const INTERNAL_HEADER = "x-mercadito-internal-runtime";
const INTERNAL_VALUE = "materialized-marketplace-refresh-v1";

export async function POST(request: Request) {
  if (request.headers.get(INTERNAL_HEADER) !== INTERNAL_VALUE) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const snapshot = await rebuildPublicMarketplaceSnapshot();
    return NextResponse.json(
      { ok: true, realStoreCount: snapshot.realStoreCount },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "PUBLIC_MARKETPLACE_BACKGROUND_REFRESH_FAILED",
      error instanceof Error ? { name: error.name, message: error.message.slice(0, 250) } : "Unknown",
    );
    return NextResponse.json(
      { ok: false, error: "No se pudo actualizar la copia pública." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
