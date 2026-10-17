import { NextResponse } from "next/server";
import { finishAutomaticScreening, ListingError } from "@/lib/descubre/listings";
import { notifySuperadminsSafely } from "@/lib/notifications/repository";
export const runtime = "nodejs";
export async function POST(request: Request) {
  // The edge entrypoint denies this entire route for ALL external callers.
  if (request.headers.get("x-mercadito-internal-runtime") !== "discover-automatic-screen-v1")
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  try {
    const input = await request.json() as Record<string, unknown>;
    const id = typeof input.id === "string" ? input.id : "";
    if (!/^[A-Za-z0-9_-]{8,160}$/.test(id)) throw new ListingError(400, "Anuncio inválido.");
    const status = input.decision;
    if (status !== "approved" && status !== "blocked" && status !== "needs_changes" && status !== "manual_review")
      throw new ListingError(400, "Estado inválido.");
    const decision = await finishAutomaticScreening(id, status, String(input.reason ?? ""));
    if (decision === "manual_review") {
      await notifySuperadminsSafely({
        type: "discover_manual_review",
        title: "Producto pendiente de revisión",
        message: "Hay un producto pendiente porque la revisión automática no pudo completarse.",
        href: "/admin/descubre",
        dedupeKey: `discover:review:${id}`,
      });
    }
    return NextResponse.json({ status: decision }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ListingError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "No se pudo finalizar el análisis." }, { status: 503 });
  }
}
