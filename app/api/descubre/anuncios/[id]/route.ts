import { NextResponse } from "next/server";
import { ApiAuthError, requireUnblockedUser } from "@/lib/store/auth";
import { getListing, markListingSold, ListingError } from "@/lib/descubre/listings";

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext<"/api/descubre/anuncios/[id]">) {
  try {
    const actor = await requireUnblockedUser(request);
    const { id } = await context.params;
    return NextResponse.json({ listing: await getListing(id, actor.uid) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof ApiAuthError || error instanceof ListingError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Anuncio no disponible." }, { status: 503 });
  }
}

export async function PATCH(request: Request, context: RouteContext<"/api/descubre/anuncios/[id]">) {
  try {
    const actor = await requireUnblockedUser(request);
    const { id } = await context.params;
    const input = await request.json().catch(() => ({})) as Record<string, unknown>;
    if (input.status !== "sold") return NextResponse.json({ error: "Acción no permitida." }, { status: 400 });
    await markListingSold(actor.uid, id);
    return NextResponse.json({ status: "sold" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiAuthError || error instanceof ListingError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "No se pudo actualizar el anuncio." }, { status: 503 });
  }
}
