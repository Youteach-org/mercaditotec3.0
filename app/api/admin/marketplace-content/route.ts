import { NextResponse } from "next/server";

import {
  getMarketplaceContent,
  saveMarketplaceContent,
} from "@/lib/store/marketplaceContentRepository";
import { ApiAuthError, requireAdmin } from "@/lib/store/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return NextResponse.json({ content: await getMarketplaceContent() });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Unexpected marketplace content admin read error:", error);
    return NextResponse.json(
      { error: "No se pudo cargar la configuración del Mercadito." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin(request);
    const body = await request.json().catch(() => ({}));
    return NextResponse.json({ content: await saveMarketplaceContent(body) });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Unexpected marketplace content admin save error:", error);
    return NextResponse.json(
      { error: "No se pudo guardar la configuración del Mercadito." },
      { status: 500 },
    );
  }
}
