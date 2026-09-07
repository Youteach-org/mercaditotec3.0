import { NextResponse } from "next/server";

import { listPublicStores } from "@/lib/store/publicMarketplaceRepository";

export const runtime = "nodejs";

export async function GET() {
  try {
    const stores = await listPublicStores();
    return NextResponse.json({ stores });
  } catch {
    return NextResponse.json(
      { error: "No se pudo cargar el Mercadito." },
      { status: 500 },
    );
  }
}
