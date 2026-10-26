import { NextResponse } from "next/server";
import { finishProductScreening, ProductRepositoryError } from "@/lib/store/productRepository";
import { createNotificationSafely, notifySuperadminsSafely } from "@/lib/notifications/repository";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (request.headers.get("x-mercadito-internal-runtime") !== "store-product-automatic-screen-v1") {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = typeof body.id === "string" ? body.id : "";
    const version = body.contentVersion;
    const decision = body.decision;
    if (!/^[A-Za-z0-9_-]{1,160}$/.test(id) || !Number.isSafeInteger(version) || Number(version) < 1 ||
      !["approved", "blocked", "needs_changes", "manual_review"].includes(String(decision))) {
      return NextResponse.json({ error: "Revisión inválida." }, { status: 400 });
    }
    const result = await finishProductScreening(id, Number(version), decision as "approved" | "blocked" | "needs_changes" | "manual_review", String(body.reason ?? ""));
    const approved = result.status === "approved";
    await createNotificationSafely({
      recipientUid: result.ownerUid,
      type: approved ? "store_product_review_approved" : "store_product_review_rejected",
      title: approved ? "Producto aprobado" : result.status === "manual_review" ? "Producto en revisión manual" : "Producto no aprobado",
      message: approved ? `«${result.title.slice(0, 80)}» ya puede mostrarse en Mercadito.` :
        `Revisa el estado de «${result.title.slice(0, 80)}» y su motivo en Mis tiendas.`,
      href: `/mystore/${result.storeId}`,
      dedupeKey: `store-product:${id}:${version}:${result.status}`,
    });
    if (result.status === "manual_review") {
      await notifySuperadminsSafely({
        type: "store_product_manual_review", title: "Producto de tienda pendiente de revisión",
        message: "Un producto necesita revisión manual antes de aparecer públicamente.",
        href: "/admin/descubre", dedupeKey: `store-product:manual:${id}:${version}`,
      });
    }
    return NextResponse.json({ status: result.status }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ProductRepositoryError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "No se pudo completar la revisión." }, { status: 503 });
  }
}
